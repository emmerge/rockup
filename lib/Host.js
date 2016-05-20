// RockUp
// Host -- Represent a single server/host

var path = require("path");
var inspect = require("util").inspect;
var nodemiral = require("nodemiral");
var _ = require("underscore");

module.exports = Host;

/**
 * Create an instance of a Host to have in-hand reference to configuration
 * for an individual host and run commands against it.
 *
 * @param {Config} config         The RockUp configuration we're referencing
 * @param {string} hostName       Name of the host server
 **/
function Host (config, hostName) {
  this._appName = config.appName();
  this._envName = config.envName();
  this._config = config.host(hostName);
  this._hostName = this._config.name;
  this._serviceNames = config.serviceNames( this._hostName );
}

/**
 * Return the list of services defined on this host
 **/
Host.prototype.services = function () {
  return this._config.services( this._hostName );
};

/**
 * Prepare this host by executing prep script and copying init scripts.
 **/
Host.prototype.prepare = function ( callbackFn ) {
  var envName = this._envName;
  var appName = this._appName;
  var hostName = this._hostName;

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

  console.log("Task list run initiated.");
};

/** 
 * Build and return an object containing SSH configuration for this host
 **/
Host.prototype.sshConfig = function () {
  return {
    auth: {username: this._config.username},
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
