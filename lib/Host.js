// RockUp
// Host -- Represent a single server/host

var path = require("path");
var inspect = require("util").inspect;
var nodemiral = require("nodemiral");
var _ = require("underscore");

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
  return {
    // TODO: group service methods
    list: _.map( this.src.services, function(info) { return new Service(info, this); }, this ),
    names: _.pluck( this.src.services, 'name' ),
    get: function(name) { return _.findWhere(this.list, {name: name}); },
    /**
     * Host task lists: Build a nodemiral task list for the indicated command
     * that will execute the command against all services for this host.
     * Available methods: status, start, stop, restart
     *
     * @returns {TaskList} A nodemiral task list of commands for this host
     **/
    tasks: {
      status: function() {
        var tasks = nodemiral.taskList("Checking Service Status");
        _.each( this.list, function(service) { tasks.concat( service.tasks.status() ); });
        return tasks;
      },
      start: function() {},
      stop: function() {},
      restart: function() {}
    },
    /**
     * Host command functions: Run a service command against all services for
     * this host. Available methods: status, start, stop, restart
     *
     * Each command accepts:
     * @param {Function} callback     Callback will recieve SSH results
     **/
    cmd: {
      status: function(cb) { this.run('status', cb); },
      start: function(cb) { this.run('start', cb); },
      stop: function(cb) { this.run('stop', cb); },
      restart: function(cb) { this.run('restart', cb); }
    },
    run: function(cmd, callbackFn) {
      var tasks = this.tasks[cmd];
      console.log("Running command:", cmd, "on all services for", host.name);
      callbackFn({success:true});
      // tasks.run( host.sshSession(), function (results) {
      //   // TODO: Handle results properly and return err if needed
      //   callbackFn();
      // });
    }
  };
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
  _.each ( this._serviceNames, function(serviceName) {
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
 * Build and return an object containing SSH configuration for this host
 **/
Host.prototype.sshConfig = function () {
  return {
    auth: {username: this.username},
    opts: {
      ssh: { agent: process.env.SSH_AUTH_SOCK },
      keepAlive: true
    }
  };
};

/**
 * Build and return an SSH session for this host
 **/
Host.prototype.sshSession = function () {
  var sshConfig = this.sshConfig();
  return nodemiral.session(this._hostName, sshConfig.auth, sshConfig.opts);
};
