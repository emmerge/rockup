// RockUp
// Host -- Represent a single server/host

var path = require('path');
var nodemiral = require('nodemiral');

var reduceAsync = require('./Async').reduce;
var Config = require('./Config');
var Service = require('./Service');

module.exports = Host;

/**
 * Create an instance of a Host given a host configuration. Useful for running
 * commands against the host.
 *
 * @param {Object} hostConfig     Config stanza from rockup object for this host
 **/
function Host (hostConfig) {
  this.src = hostConfig;
  this.name = hostConfig.name;
  this.shortName = this.name.split('.')[0];
  this.username = hostConfig.username;
  this.app = hostConfig.app;
  this.environment = hostConfig.environment;
  this.confs = hostConfig.confs;
  this.services = this._extractServices();
  delete this.src;  // src used for extraction, then unneeded
}

/**
 * Extract service information from the host source configuration.
 **/
Host.prototype._extractServices = function () {
  var host = this;
  var services = {
    count: this.src.services.length,
    list: _.map( this.src.services, function(info) { return new Service(info, this); }, this ),
    names: _.pluck( this.src.services, 'name' ),
    get: function(name) { return _.findWhere(this.list, {name: name}); },
    first: function() { return this.list[0]; },
    each: function(predicate) { _.each(this.list, function(s, i) { predicate(s, i); }); },
    map: function(predicate) { return _.map(this.list, function(s, i) { return predicate(s, i); }); }
  };

  return services;
};


/**
 * Prepare this host by executing prep script and copying init scripts.
 **/
Host.prototype.prepare = function ( callbackFn ) {
  var envName = this.environment;
  var appName = this.app.name;
  var hostName = this.name;

  var templateDir = path.resolve(__dirname, '..', 'templates');

  var tasks = nodemiral.taskList("Prepare "+hostName+" for "+appName);

  // Prepare script establishes /opt source dirs, permissions:
  tasks.executeScript("Creating src container dirs for "+appName, {
    script: path.resolve(templateDir, 'prepare.sh'),
    vars: {
      envName: envName,
      appName: appName,
      hostName: hostName
    }
  });

  // For each service, initialize the corresponding upstart script:
  _.each ( this.services.names, function(serviceName) {
    tasks.copy("Configuring upstart service "+serviceName, {
      src: path.resolve(templateDir, 'upstart.conf'),
      dest: "/etc/init/"+serviceName+".conf",
      vars: {
        envName: envName,
        appName: appName,
        hostName: hostName,
        serviceName: serviceName
      }
    });
  });

  tasks.run( this.sshSession(), function (results) {
    callbackFn(results);
  });
};

/**
 * Get deployment history for this host.
 *
 * @params {Function} callbackFn    Function will be called back with error,
 *                                  and list of releases (e.g., "r20160520_185148")
 **/
Host.prototype.history = function ( callbackFn ) {
  var host = this;
  var appName = this.app.name;
  var hostName = this.name;
  var releasesDir = "/opt/"+appName+"/releases";
  var currentSymlink = "/opt/"+appName+"/current";

  var session = this.sshSession({keepAlive: true});
  
  function listReleases (memo, cb) {
    host.sshCapture(session, "ls -1r "+releasesDir, function(err, output) {
      if (err) {
        cb(err);
      } else {
        var releaseNames = output.split("\n") || [];
        releaseNames = _(releaseNames).select(function(r) { if (r) return true; });
        memo.list = releaseNames;
        cb();
      }
    });
  }
  
  function statCurrent (memo, cb) {
    host.sshCapture(session, "stat "+currentSymlink+" | grep /releases/"/*+releasesDir*/, function(err, output) {
      if (err) {
        cb(err);
      } else {
        // var re = new RegExp( releasesDir.replace('/','\/')+"\/([r_0-9]+)" );   // Too strict? Includes full path?
        var re = /\/releases\/([r_0-9]+)/;
        var currentMatch = output.match(re);
        var currentName = currentMatch && currentMatch[1];
        memo.current = currentName;
        cb();
      }
    });
  }

  function allComplete (memo) {
    session.close();
    callbackFn(null, memo);
  }

  reduceAsync({}, listReleases, statCurrent, allComplete);
};

/**
 * Return an array of appropriate lifecycle commands used on-host for this service
 * given a desired action.
 *
 * @param {String} action       Name of action to take: start, stop, restart
 * @returns {String}            The command to run (e.g., 'sudo start service')
 **/
Host.prototype._lifeCycleCommands = function ( action ) {
  return this.services.map( function(service) {
    return service._lifeCycleCommand(action);
  });
};

/**
 * Run an array of lifecycle commands for this service against its host. Condenses
 * commands for all services into a single SSH session on box.
 *
 * @param {String} action       Name of action to take: start, stop, restart
 * @param {String} callbackFn   Callback function receives error, true/false for success
 **/
Host.prototype._lifeCycleEvent = function ( action, callbackFn ) {
  var commands = this._lifeCycleCommands(action);
  var session = this.sshSession({keepAlive: true});

  var operations = _.map(commands, function(command) {
    return function (memo, cb) {
      session.execute(command, function (err, code, context) {
        if (err) { cb(err); }
        else {
          memo.push( code === 0 );    // Build an array of true/false responses
          cb();
        }
      });
    };
  });

  // Recieves a map of command ('sudo start service') to true/false
  function _allServicesComplete( commandMap ) {
    session.close();
    callbackFn(commandMap);
  }

  operations.unshift([]);     // Start reduction w/ empty Array
  operations.push(_allServicesComplete);
  reduceAsync.apply(this, operations);
};

Host.prototype.start = function ( callbackFn ) {
  this._lifeCycleEvent('start', callbackFn);
};
Host.prototype.stop = function ( callbackFn ) {
  this._lifeCycleEvent('stop', callbackFn);
};
Host.prototype.restart = function ( callbackFn ) {
  this._lifeCycleEvent('restart', callbackFn);
};

/**
 * Return a map of { serviceName: status (running/stopped) } for all 
 * services running on this Host.
 * 
 * A Host can have the following service status:
 *   running:   All defined services are running
 *   stopped:   All defined services are NOT running
 *   partial:   SOME of the defined services are running, some are not
 *   unknown:   Likely configuration or preparation error
 *
 * @param {Function} callbackFn   Callback triggered with error, overall
 *    host status as a string, and map of statuses.
 **/
Host.prototype.status = function ( callbackFn ) {
  var host = this;
  
  // Get every service status into a map of name: status
  var ops = this.services.map( function(service) {
    return function (memo, cb) {
      service.status( function(err, status) {
        if (err) { cb(err); }
        else {
          memo[service.name] = status;
          cb();
        }
      });
    };
  });

  // Recieves final memo, a map of service names and states
  function allServicesComplete ( statusMap ) {
    var statuses = { running: false, stopped: false, unkown: false };
    _.each(statusMap, function(status, serviceName) {
      if (status == 'running' || status == 'stopped')
        statuses[status] = true;
      else
        statuses.unknown = true;
    });

    if (statuses.running && !statuses.stopped)
      overall = 'running';
    else if (!statuses.running && statuses.stopped)
      overall = 'stopped';
    else if (statuses.running && statuses.stopped)
      overall = 'partial';
    else
      overall = 'unknown';

    callbackFn(null, overall, statusMap);
  }

  ops.unshift({}); // memo
  ops.push(allServicesComplete);
  reduceAsync.apply(this, ops);
};


/**
 * Return a nodemiral task list for deploying to this Host:
 *  - Create release directory
 *  - Upload app bundle
 *  - Upload ea. service boot script
 *  - Upload ea. service Meteor settings
 *  - Execute deploy script (move, rebuild, restart)
 *
 * @params {String} releaseName   Name of the deployment
 * @params {String} bundlePath    Local path to zipped bundle archive
 * @returns {Object}              Nodemiral task list for deployment
 **/
Host.prototype._deployTasks = function (releaseName, bundlePath) {
  var envName = this.environment;
  var appName = this.app.name;
  var releaseDir = "/opt/"+appName+"/releases/"+releaseName;

  var templateDir = path.resolve(__dirname, '..', 'templates');
  var tasks = nodemiral.taskList("Deploy "+appName+" to "+envName+" environment");

  // Build a release directory on the server and place bundle:
  tasks.execute("Creating release directory", {
    command: "mkdir -p "+releaseDir+"/config"
  });
  tasks.copy("Uploading bundle", {
    src: bundlePath,
    dest: path.resolve(releaseDir, "bundle.tar.gz"),
    progressBar: true
  });

  // For each service, invoke additional deployment:
  host.services.each( function(service) {
    
    // Place environment prep script:
    tasks.copy("Uploading "+service.name+" boot script", {
      src: path.resolve(templateDir, 'env.sh'),
      dest: path.resolve(releaseDir, "config", "env."+service.name+".sh"),        // TODO: Vet this filename convention
      vars: {
        env: service.env || {},
        appName: appName,
        envName: envName,
        hostName: host.name,
        serviceName: service.name,
        settingsJson: "settings."+service.name+".json"
      }
    });

    // Place Meteor settings file:
    // TODO: Check for existence of file before sourcing
    var settingsFileLocal = path.resolve( process.cwd(), 'deploy', envName+".settings.json");
    var settingsFileTarget = path.resolve( releaseDir, 'config', 'settings.'+service.name+'.json');
    tasks.copy("Uploading "+service.name+" Meteor settings", {
      src: settingsFileLocal,
      dest: settingsFileTarget
    });

  }); // services

  // Execute deployment script:
  tasks.executeScript("Unpacking, moving code, and restarting services", {
    script: path.resolve(templateDir, 'deploy.sh'),
    vars: {
      appName: appName,
      envName: envName,
      hostName: host.name,
      releaseName: releaseName,
      serviceNames: host.services.names
    }
  });

  return tasks;
};

/**
 * Run the tasks to deploy to this Host in an SSH session.
 **/
Host.prototype.deploy = function(releaseName, bundlePath, callbackFn) {
  var host = this;
  var tasks = this._deployTasks(releaseName, bundlePath);
  tasks.run( host.sshSession(), function (taskResults) {
    console.log( ("Deployment to "+host.name+" complete!").green );

    var hostResults = taskResults[host.name] || {};
    if ( hostResults.error ) {
      console.error("Error deploying to "+host.name);
      callbackFn(hostResults.error);
    } else {
      console.log("Successful deployment to "+host.name);
      callbackFn(null, hostResults);
    }
  });
};



/** 
 * Build and return an object containing SSH configuration for this host
 **/
Host.prototype.sshConfig = function () {
  return {
    auth: {username: this.username},
    opts: {
      ssh: { agent: process.env.SSH_AUTH_SOCK },
      keepAlive: false
    }
  };
};

/**
 * Build and return an SSH session for this host.
 *
 * @params {Object} options           Options to pass to session construct
 * @params {Bool} options.keepAlive   Set to true to keep this session
 *                                    alive until explicitly closed.
 * @returns {nodemiral.Session}
 **/
Host.prototype.sshSession = function (options) {
  var sshConfig = this.sshConfig();
  if ( !options ) { options = {}; }
  if ( !_.isUndefined(options.keepAlive) ) { sshConfig.opts.keepAlive = options.keepAlive; }
  return nodemiral.session(this.name, sshConfig.auth, sshConfig.opts);
};

/**
 * Capture the stdout of a SSH execution and return it to a callback.
 *
 * @param session     The active SSH session
 * @param command     The command to run (string)
 * @param cb          Callback function will receive err, output (string)
 **/
Host.prototype.sshCapture = function (session, command, cb) {
  session.execute(command, function (err, code, context) {
    if (err) {
      cb(err);
    } else {
      var output = context && context.stdout || "";
      cb(null, output);
    }
  });
};
