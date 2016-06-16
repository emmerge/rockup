// RockUp
// Commands-Prepare -- Prepare the server-side to accept deployments

var Config = require('../lib/Config');
var _getHosts = require('../commands/util')._getHosts;

var async = require('async');

module.exports = PrepareCommand;

function PrepareCommand (program) {
  program
    .command("prep <environment>")
    .description("Prepare a server host to accept deployments")
    .option("-H, --host <name>", "Specify an individual host to prep")
    .on("--help", function(){
      console.log("  Examples:\n");
      console.log("    $ rock prep production               # Prepare all hosts");
      console.log("    $ rock history staging --host app1   # Only prepare host app1");
      console.log("\n  Notes:\n");
      console.log("    Preparation is required before you are able to deploy to hosts in your");
      console.log("    environment.\n");
      console.log("    The preparation command is idempotent and can be run multiple times against");
      console.log("    each host without concern.");
      console.log();
    })
    .action( _prepareHosts );
  return program;
}

/**
 * Perform the prepare operation.
 *
 * @params {String} environment       The RockUp environment name
 * @params {Object} cliOptions        The Commander CLI options
 **/
function _prepareHosts (environment, cliOptions) {
  var config = Config._loadLocalConfigFile(environment);
  var hosts = _getHosts(config, cliOptions);
  var numHosts = hosts.length;

  var calls = {};
  _(hosts).each( function(host) {
    var f = function (cb) {
      host.prepare( function(results) {
        var err = results[host.name].error;
        var sshHistory = results[host.name].history;
        if (err)
          cb(err);
        else {
          var successful = _(sshHistory).every( function(obj) { return obj.status === 'SUCCESS'; });
          cb(null, successful);
        }
      });
    };
    calls[host.name] = f;
  });

  function _allComplete (err, hostMap) {
    if (err) {
      console.log("  => Failure:".red.bold, "Unable to prepare:", err, "\n");
      process.exit(1);
    }
    console.log("\nPreparation complete for "+(numHosts==1 ? "1 host" : numHosts+" hosts")+":");
    _.each(hostMap, function(success, hostName) {
      console.log(hostName.bold, "\t", success ? 'SUCCESS'.green.bold : 'FAIL'.red.bold);  
    });
    console.log();
    process.exit(0);
  }

  async.parallel(calls, _allComplete);  
}
