// RockUp
// Host -- Represent a single server/host

var path = require("path");
var inspect = require("util").inspect;
var nodemiral = require("nodemiral");
var _ = require("underscore");

var reduceAsync = require('../commands/util').reduceAsync;
var Config = require("./Config");
var Service = require("./Service");

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
    map: function(predicate) { return _.map(this.list, function(s, i) { return predicate(s, i); }); },
    /**
     * Host task lists: Build a nodemiral task list for the indicated command
     * that will execute the command against all services for this host.
     * Available methods: status, start, stop, restart
     *
     * @returns {TaskList} A nodemiral task list of commands for this host
     **/
    tasks: {
      status: function() { return _build('status'); },
      start: function() { return _build('start'); },
      stop: function() { return _build('stop'); },
      restart: function() { return _build('restart'); },
    },

    /**
     * Host command functions: Run a service command against all services for
     * this host. Available methods: status, start, stop, restart
     *
     * Each command accepts:
     * @param {Function} callback     Callback will recieve SSH results
     **/
    run: {
      status: function(cb) { _cmd('status', cb); },
      start: function(cb) { _cmd('start', cb); },
      stop: function(cb) { _cmd('stop', cb); },
      restart: function(cb) { _cmd('restart', cb); }
    }
  };

  function _build(cmd) {
    var tasks = nodemiral.taskList("Host Services: "+cmd);
    var subTasks = _.map( services.list, function(service) { return service.tasks[cmd](); } );
    return tasks.concat(subTasks, cmd.toUpperCase()+" all "+host.name+" services");
  }

  function _cmd(cmd, callbackFn) {
    _build(cmd).run( host.sshSession(), function (results) {
      callbackFn( results );
    });
  }

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

  //console.log("Task list for preparation:", inspect(tasks, {colors:true, depth:null}));

  tasks.run( this.sshSession(), function (results) {
    console.log("Preparation complete for "+hostName);
    // TODO: Handle results properly and return err if needed
    callbackFn();
  });
};

/**
 * Get deployment history for this host.
 *
 * @params {Function} callbackFn    Function will be called back with error,
 *                                  and list of releases (e.g., "r20160520_185148")
 **/
Host.prototype.history = function ( callbackFn ) {
  var appName = this.app.name;
  var hostName = this.name;
  var releasesDir = "/opt/"+appName+"/releases";
  var currentSymlink = "/opt/"+appName+"/current";

  var session = this.sshSession({keepAlive: true});
  
  function listReleases (memo, cb) {
    session.execute("ls -1r "+releasesDir, function (err, code, context) {
      if (err) {
        cb(err);
      } else {
        var releaseNames = context && context.stdout && context.stdout.split("\n") || [];
        releaseNames = _(releaseNames).select(function(r) { if (r) return true; });
        memo.list = releaseNames;
        cb();
      }
    });
  }
  
  function statCurrent (memo, cb) {
    session.execute("stat "+currentSymlink+" | grep /releases/"/*+releasesDir*/, function (err, code, context) {
      if (err) {
        cb(err);
      } else {
        var output = context && context.stdout && context.stdout || "";
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
