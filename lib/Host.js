// RockUp
// Host -- Represent a single server/host

var Config = require('./Config');
var Service = require('./Service');

var _ = require('underscore');
var inspect = require('util').inspect;
var path = require('path');
var nodemiral = require('nodemiral');
var async = require('async');

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
 * Return a nodemiral task list for preparing this Host:
 *  - Create app source directories under /opt
 *  - Install npm dependencies
 *  - Add upstart script for each service
 *
 * @returns {Object}              Nodemiral task list for deployment
 **/
Host.prototype._prepareTasks = function () {
  var envName = this.environment;
  var appName = this.app.name;
  var hostName = this.name;
  var templateDir = path.resolve(__dirname, '..', 'templates');

  var destAppDir = path.resolve("/opt", appName);
  var destReleasesDir = path.resolve(destAppDir, "releases");
  var destScriptsDir = path.resolve(destAppDir, "scripts");

  var tasks = nodemiral.taskList("Prepare "+hostName+" for "+appName);

  // Preparation:
  tasks.execute("Create app /opt directory", { command: _mkdirAndChownCommand(destAppDir) });
  tasks.execute("Create app releases directory", { command: _mkdirAndChownCommand(destReleasesDir) });
  tasks.execute("Create app scripts directory", { command: _mkdirAndChownCommand(destScriptsDir) });
  tasks.execute("Install npm dependencies", { command: "sudo npm install -g forever userdown node-gyp" });
  tasks.execute("Add app user", { command: "sudo useradd meteoruser || :" });

  // For each service, initialize the corresponding upstart script:
  this.services.each( function(service) {
    var tmpScriptPath = path.resolve(destScriptsDir, service.name+".conf");
    var finalScriptPath = path.resolve("/etc/init", service.name+".conf");
    tasks.copy("Upload upstart script for "+service.name, {
      src: path.resolve(templateDir, 'upstart.conf'),
      dest: tmpScriptPath,
      vars: {
        envName: envName,
        appName: appName,
        hostName: hostName,
        serviceName: service.name
      }
    });
    tasks.execute("Install upstart script for "+service.name, {
      command: "sudo cp "+tmpScriptPath+" "+finalScriptPath+";"
    });
  });

  function _mkdirAndChownCommand(dirName) {
    return "sudo mkdir -p "+dirName+"; sudo chown `whoami`:`whoami` "+dirName+";";
  }

  return tasks;
};

/**
 * Prepare this host by executing prep script and copying init scripts.
 **/
Host.prototype.prepare = function ( callbackFn ) {
  this._prepareTasks().run( this.sshSession(), function (results) {
    callbackFn(results);
  });
};


/**
 * Get deployment history for this host.
 *
 * @params {Function} callbackFn  Callback will be called with first argument
 *    error (null on success) and second argument a map containing 'list': []
 *    and 'current': String
 **/
Host.prototype.history = function ( callbackFn ) {
  var host = this;
  var appName = this.app.name;
  var hostName = this.name;
  var releasesDir = "/opt/"+appName+"/releases";
  var currentSymlink = "/opt/"+appName+"/current";

  var session = this.sshSession({keepAlive: true});
  
  var calls = {
    list: function (cb) {
      host.sshCapture(session, "ls -1r "+releasesDir, function(err, output) {
        if (err) {
          cb(err);
        } else {
          var releaseNames = output.split("\n") || [];
          releaseNames = _(releaseNames).select(function(r) { if (r) return true; });
          cb(null, releaseNames.sort().reverse());
        }
      });
    },
  
    current: function(cb) {
      host.sshCapture(session, "stat "+currentSymlink+" | grep /releases/", function(err, output) {
        if (err) {
          cb(err);
        } else {
          var re = /\/releases\/([r_0-9]+)/;
          var currentMatch = output.match(re);
          var currentName = currentMatch && currentMatch[1];
          cb(null, currentName);
        }
      });
    }
  }; // calls

  function _allComplete (err, results) {
    session.close();
    callbackFn(err, results);
  }

  async.parallel(calls, _allComplete);
};


/**
 * Switch the active version of the code running on this host
 * to match the indicated release.
 *
 * @param {String} releaseName    Name of the release to switch to
 * @param {Function} cb(err, success)   Callback, {Boolean} success
 **/
Host.prototype.rollback = function (releaseName, cb) {
  var host = this;
  var appName = this.app.name;
  var appDir = path.resolve("/opt", appName);
  var releaseDir = path.resolve(appDir, "releases", releaseName);

  var tasks = nodemiral.taskList("Rollback "+appName+" to "+releaseName);
  tasks.execute("Verifying release is present", {
    command: "test -d "+releaseDir
  });
  tasks.execute("Updating current symlink", {
    command: "cd "+appDir+"; sudo rm -rf current; sudo ln -s "+releaseDir+" ./current"
  });
  _.each( this._lifeCycleCommands('restart'), function(restartCommand) {
    tasks.execute("Restarting service", {command: restartCommand});
  });

  tasks.run(this.sshSession(), function(results) {
    var err = results[host.name].error;
    if (err)
      cb(new Error("Unable to rollback: "+err));
    else
      cb(null, results);
  });
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

  var calls = _(commands).map( function(command) {
    return function (cb) {
      session.execute(command, function (err, code, context) {
        cb(err, code === 0);    // Did the life cycle command complete w/o error?
      });
    };
  });

  // Recieves an _array_ of true/false for each service's command execution:
  function _allComplete( err, resultList ) {
    session.close();
    callbackFn(err, resultList);
  }

  async.parallel(calls, _allComplete);
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
  
  // Collect all statuses in a map of name: status
  var calls = {};
  this.services.each( function(service) {
    var f = function (cb) {
      service.status( function(err, status) {
        cb(err, status);
      });
    };
    calls[service.name] = f;
  });

  // Recieves final memo, a map of service names and states
  function _allComplete ( err, statusMap ) {
    if (err) return callbackFn(err);
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

  async.parallel( calls, _allComplete );
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
  var host = this;
  var envName = this.environment;
  var appName = this.app.name;
  var releaseDir = path.resolve("/opt", appName, "releases", releaseName);

  var templateDir = path.resolve(__dirname, '..', 'templates');
  var tasks = nodemiral.taskList("Deploy "+appName+" to "+envName);

  // Build a release directory on the server and place bundle:
  tasks.execute("Creating release directory", {
    command: "mkdir -p "+releaseDir+"/config"
  });
  tasks.copy("Uploading bundle", {
    src: bundlePath,
    dest: path.resolve(releaseDir, "bundle.tar.gz"),
    progressBar: true
  });

  // Reconfigure each service:
  var reconfigureTasks = host._reconfigureTasks({releaseName: releaseName, withRestart: false});
  tasks = tasks.concat( [reconfigureTasks], tasks.name );

  // Execute deployment script:
  tasks.executeScript("Installing application", {
    script: path.resolve(templateDir, 'deploy.sh'),
    vars: {
      appName: appName,
      envName: envName,
      hostName: host.name,
      releaseName: releaseName
    }
  });

  // Restart each service:
  host.services.each( function(service) {
    tasks.execute("Restarting Service "+service.name, {
      command: service._lifeCycleCommand('restart')
    });
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
 * Return a nodemiral task list for reconfiguring to this Host:
 *  - Upload ea. service boot script
 *  - Upload ea. service Meteor settings
 *  - Restart services
 *
 * @params {Object} options       
 * @params {Bool} options.withRestart   Set true to include service restart
 * @params {String} options.releaseName Specify if reconfigure a release (if
 *                                      not set, current symlink is used).
 * @returns {Object} Nodemiral task list for deployment
 **/
Host.prototype._reconfigureTasks = function (options) {
  var envName = this.environment;
  var appName = this.app.name;

  options = options || {withRestart: true};

  var templateDir = path.resolve(__dirname, '..', 'templates');
  var releaseDir;
  if (options.releaseName)
    releaseDir = path.resolve("/opt", appName, "releases", options.releaseName);
  else
    releaseDir = path.resolve("/opt", appName, "current");

  var tasks = nodemiral.taskList("Reconfigure "+appName+" in "+envName+" environment");

  // For each service, invoke additional deployment:
  var host = this;
  host.services.each( function(service) {
    var settingsJson = 'settings.'+service.name+'.json';
    var settingsFileLocal = service.settingsPath;
    var settingsFileTarget = path.resolve( releaseDir, 'config', settingsJson);

    // Place environment prep script:
    tasks.copy("Uploading env script ("+service.name+")", {
      src: path.resolve(templateDir, 'env.sh'),
      dest: path.resolve(releaseDir, 'config', 'env.'+service.name+'.sh'),
      vars: {
        env: service.env || {},
        appName: appName,
        envName: envName,
        hostName: host.name,
        serviceName: service.name,
        settings_path: settingsFileTarget
      }
    });

    // Place Meteor settings file:
    // TODO: Check for existence of file before sourcing
    tasks.copy("Uploading Meteor settings ("+service.name+")", {
      src: settingsFileLocal,
      dest: settingsFileTarget
    });

    // If asked, restart the service:
    if (options.withRestart) {
      tasks.execute("Restarting ("+service.name+")", {
        command: service._lifeCycleCommand('restart')
      });
    }

  }); // services

  return tasks;
};

/**
 * Run the tasks to reconfigure on this Host in an SSH session.
 *
 * Calling reconfigure(cb) by default reconfigures the current release only. You
 * can reconfigure a release by name by calling _reconfigureTasks and executing.
 **/
Host.prototype.reconfigure = function(callbackFn) {
  var host = this;
  var tasks = this._reconfigureTasks({withRestart: true});
  tasks.run( host.sshSession(), function (taskResults) {
    console.log( ("Reconfigure on "+host.name+" complete!").green );
    var hostResults = taskResults[host.name] || {};
    if ( hostResults.error ) {
      console.error("Error reconfiguring on "+host.name);
      callbackFn(hostResults.error);
    } else {
      console.log("Successful reconfigure on "+host.name);
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
