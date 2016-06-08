// RockUp
// Service -- Represent a single service on a single host

var path = require("path");
var inspect = require("util").inspect;
var nodemiral = require("nodemiral");
var _ = require("underscore");

var Host = require("./Host");

module.exports = Service;

/**
 * Create an instance of a Service given a service stanza from a rockup config
 * in order to run commands against the service.
 *
 * @param {Object} serviceConfig  Config stanza for this service
 * @param {Host} host             The host that runs this service
 **/
function Service (serviceConfig, host) {
  this.src = serviceConfig;
  this.host = host;
  this.name = serviceConfig.name;
  this.env = serviceConfig.env;
  // TODO: Get Relative Path from Config File into this settingsPath declaration!!!!
  // TODO: Get Relative Path from Config File into this settingsPath declaration!!!!
  // TODO: Get Relative Path from Config File into this settingsPath declaration!!!!
  this.settingsPath = serviceConfig.settingsPath ? path.resolve( process.cwd(), serviceConfig.settingsPath ) : null;
}

/**
 * Run a lifecycle command for this service against its host.
 *
 * @param {String} action       Name of action to take: start, stop, restart
 * @param {String} cb           Callback function receives error, true/false for success
 **/
Service.prototype._lifeCycle = function ( action, cb ) {
  var command;
  switch (action) {
    case 'start':   command = "sudo start "+this.name; break;
    case 'stop':    command = "sudo stop "+this.name; break;
    case 'restart': command = "sudo restart "+this.name; break;
  }
  if (!command) { return callbackFn( new Error("Invalid action name") ); }

  this.sshSession({keepAlive: false}).execute(command, function (err, code, context) {
    if (err) {
      cb(err);
    } else {
      if (code === 0)
        cb(null, true);
      else
        cb( new Error("Unable to "+action+" service. Exit code: "+code) );
    }
  });
};

Service.prototype.start = function ( cb ) {
  this._lifeCycle('start', cb);
};

Service.prototype.stop = function ( cb ) {
  this._lifeCycle('stop', cb);
};

Service.prototype.restart = function ( cb ) {
  this._lifeCycle('restart', cb);
};

/**
 * Retrieve the status for this service from its host.
 *
 * @param callbackFn      Callback receives err, status (from 'stopped', 'running')
 **/
Service.prototype.status = function ( callbackFn ) {
  // TODO: Allow a session to be accepted by this method for chaining by host
  var session = this.sshSession({keepAlive: false});
  this.host.sshCapture(session, "sudo status "+this.name, function(err, output) {
    if (err) {
      callbackFn(err);
    } else {
      if (output.match('stop'))
        callbackFn(null, 'stopped');
      else if (output.match('start'))
        callbackFn(null, 'running');
      else
        callbackFn( new Error("Cannot decipher status response from service") );
    }
  });
};

/**
 * Access the SSH config for this service's host.
 *
 * @returns {Object}    Configuration options for SSH
 **/
Service.prototype.sshConfig = function () {
  return this.host.sshConfig();
};

/**
 * Acquire an SSH session to this service's host, using the config
 * returned by sshConfig.
 *
 * @returns {Object}    Nodemiral SSH session
 **/
Service.prototype.sshSession = function (options) {
  return this.host.sshSession(options);
};
