// RockUp
// Host -- Represent a single server/host

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
  this._config = config.host(hostName);
  this._hostName = this._config.name;
}

/**
 * Prepare the host by executing a the prep script against it.
 **/
Host.prototype.prepare = function () {
  var appName = this._appName;
  var hostName = this._hostName;

  var auth = {username: this._config.username};
  var sshOpts = {
    ssh: { agent: process.env.SSH_AUTH_SOCK },
    keepAlive: true
  };
  var sshSession = nodemiral.session(hostName, auth, sshOpts);

  var sshTasks = nodemiral.taskList("Prepare "+hostName+" for "+appName);

  sshTasks.executeScript("Creating config and code directories on "+hostName+" for app "+appName, {
    script: path.resolve(TEMPLATES_DIR, 'prepare.sh'),    // TODO: Adjust template source dir
    vars: {
      appName: appName                                    // TODO: Add additional vars for host+service+env, etc.
    }
  });

  sshTasks.run(sshSession, function (results) {
    console.log("Preparation complete for "+hostName);
    _.each(results, function(output, command) {
      console.log(command.green);
      console.log(output);
    });
  });
};
