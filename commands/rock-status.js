// RockUp
// Commands-Status -- Load stopped/running state for services

var Config = require('../lib/Config');
var _getHosts = require('../commands/util')._getHosts;

var async = require('async');
var Spinner = CLUI.Spinner;

module.exports = StatusCommand;

function StatusCommand (program) {

  program
    .command("status <environment>")
    .description("Display status for running/stopped services")
    .option("-H, --host <name>", "Limit action to specific host")
    .action( _gatherStatuses );

  return program;
}

/**
 * Perform the status operation.
 *
 * @params {String} environment       The RockUp environment name
 * @params {Object} cliOptions        The Commander CLI options
 **/
function _gatherStatuses (environment, cliOptions) {
  var config = Config._loadLocalConfigFile(environment);
  var hosts = _getHosts(config, cliOptions);
  var numHosts = hosts.length;

  var spinner = new Spinner("Querying "+(numHosts==1 ? "1 host" : numHosts+" hosts")+" for service status...");
  spinner.start();

  var calls = {};
  _(hosts).each( function(host) {
    var f = function (cb) {
      host.status( function(err, status, map) {
        --numHosts;
        spinner.message("Querying "+(numHosts==1 ? "1 host" : numHosts+" hosts")+" for service status...");
        if (err)
          cb(err); 
        else
          cb(null, [status, map]);
      });
    };
    calls[host.name] = f;
  });


  // Receives map of hostname: [status string, serviceMap{}]
  function _allComplete ( err, statusMap ) {
    spinner.stop();
    if (err) {
      console.log("  => Failure:".red.bold, "Unable to query status:", err, "\n");
      process.exit(1);
    }
    _.each( statusMap, function(statusDetails, hostName) {
      var status = statusDetails[0];
      var serviceMap = statusDetails[1];
      console.log(hostName.bold, "\t", _colorizeStatus(status), "\t", inspect(serviceMap).replace("\n", " ") );
    });
    console.log();
    process.exit(0);
  }

  async.parallel(calls, _allComplete);

  function _colorizeStatus(s) {
    if (s == 'running') return s.green.bold;
    else if (s == 'stopped') return s.red.bold;
    else return s.yellow.bold;
  }
}

