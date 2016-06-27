// RockUp
// Service -- Represent a single service on a single host

var _ = require('underscore');
var inspect = require('util').inspect;
var path = require('path');
var nodemiral = require('nodemiral');

var Host = require('./Host');

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
  this.settingsPath = serviceConfig.settingsPath;
}

/**
 * Return the appropriate lifecycle command used on-host for this service given a
 * desired action.
 *
 * @param {String} action       Name of action to take: start, stop, restart
 * @returns {String}            The command to run (e.g., 'sudo start service')
 **/
Service.prototype._lifeCycleCommand = function ( action ) {
  var command;
  switch (action) {
    case 'start':   command = "sudo service "+this.name+" start"; break;
    case 'stop':    command = "sudo service "+this.name+" stop"; break;
    case 'restart': command = "sudo service "+this.name+" stop; sudo service "+this.name+" start;"; break;
  }
  if (!command) { throw new Error("Invalid action name"); }

  return command;
};

/**
 * Run a lifecycle command for this service against its host. Runs in a single
 * non-keepalive connection to host. Call corresponding method on Host to chain
 * lifecycle events for all services on box.
 *
 * @param {String} action       Name of action to take: start, stop, restart
 * @param {String} cb           Callback function receives error, true/false for success
 **/
Service.prototype._lifeCycleEvent = function ( action, cb ) {
  var command = this._lifeCycleCommand(action);
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
  this._lifeCycleEvent('start', cb);
};

Service.prototype.stop = function ( cb ) {
  this._lifeCycleEvent('stop', cb);
};

Service.prototype.restart = function ( cb ) {
  this._lifeCycleEvent('restart', cb);
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
