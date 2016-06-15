// RockUp
// Commands-StartStop -- Cycle service state within target environment

var _getHosts = require('../commands/util')._getHosts;
var Config = require('../lib/Config');
var Spinner = CLUI.Spinner;

var async = require('async');

module.exports = StartStopCommand;

function StartStopCommand (program) {

  _.each(["start", "stop", "restart"], function(actionName) {
    program
      .command(actionName+" <environment>")
      .description("On host, "+actionName+" services running this app")
      .option("--host <name>", "Target a single host from environment")
      // .option("--service <name>", "Specify individual service to "+actionName)
      .action( function(environment, cliOptions) {
        _performAction(actionName, environment, cliOptions);
      });

  });

  return program;
}

/**
 * Perform the start/stop/restart operation.
 *
 * @params {String} actionName        The name of the action we're taking (e.g., 'start')
 * @params {String} environment       The RockUp environment name
 * @params {Object} cliOptions        The Commander CLI options
 **/
function _performAction ( actionName, environment, cliOptions ) {
  var config = Config._loadLocalConfigFile(environment);
  var hosts = _getHosts(config, cliOptions);
  var numHosts = hosts.length;
  var gerund = { 'start': 'Starting', 'stop': 'Stopping', 'restart': 'Restarting'}[actionName];
  
  var spinner = new Spinner(gerund+" services on "+(numHosts==1 ? "1 host" : numHosts+" hosts")+"...");
  spinner.start();

  var calls = {};
  _(hosts).each( function(host) {
    var f = function(cb) {
      host[actionName]( function(err, result) {
        --numHosts;
        spinner.message(gerund+" services on "+(numHosts==1 ? "1 host" : numHosts+" hosts")+"...");
        cb(err, result);
      });
    };
    calls[host.name] = f;
  });

  function _allComplete (err, hostMap) {
    spinner.stop();
    if (err) {
      console.log("  => Failure:".red.bold, "Unable to perform "+actionName+" action :", err, "\n");
      process.exit(1);
    }
    _.each(hostMap, function(result, hostName) {
      console.log(hostName.bold, "\t", inspect(result, {colors:true}).replace("\n", " ") );
    });
    console.log();
  }

  async.parallel( calls, _allComplete );

}

