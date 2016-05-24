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

  this._injectTasks();
  this._injectCommands();
}

/**
 * Inject task builders for this service. Attaches methods that can
 * be called to build task lists supporting checking status, start,
 * stop, restart for this service.
 *
 * @private
 **/
Service.prototype._injectTasks = function () {
  var service = this;
  this.tasks = {
    status: function() { return _build('status'); },
    start: function() { return _build('start'); },
    stop: function() { return _build('stop'); },
    restart: function() { return _build('restart'); }
  };
  function _build(cmd) {
    var tasks = nodemiral.taskList("Service: "+cmd);
    tasks.execute(cmd, { command: "(sudo "+cmd+" "+service.name+")" });
    return tasks;
  }
};

/**
 * Inject runnable commands for this service. Attaches methods that
 * can be called to check status, start, stop, restart this service.
 *
 * @private
 **/
Service.prototype._injectCommands = function () {
  var service = this;
  this.run = {
    status: function(cb) { _cmd('status', cb); },
    start: function(cb) { _cmd('start', cb); },
    stop: function(cb) { _cmd('stop', cb); },
    restart: function(cb) { _cmd('restart', cb); }
  };
  function _cmd(cmd, callbackFn) {
    var tasks = this.tasks[cmd];
    tasks.run( service.host.sshSession(), function (results) {
      // TODO: Handle results properly and return err if needed
      callbackFn( results );
    });
  }
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
Service.prototype.sshSession = function () {
  return this.host.sshSession();
};
