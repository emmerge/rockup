// RockUp
// Commands-Rollback -- Change active server code to reference a previously deployed version

var Config = require('../lib/Config');
var _getHosts = require('../commands/util')._getHosts;

var async = require('async');

module.exports = RollbackCommand;

function RollbackCommand (program) {

  program
    .command("rollback <environment>")
    .option("--host <name>", "Rollback on only a single host")
    .option("-r, --release <name>", "Name of release to roll back to (defaults to previous)")
    .description("Rollback to a previous deployment")
    .action( _performRollback );

  return program;
}

function _performRollback (environment, cliOptions) {
  var config = new Config._loadLocalConfigFile(environment);
  var hosts = _getHosts(config, cliOptions);
  var numHosts = hosts.length;
  
  var targetRelease = cliOptions.release;
  if (! targetRelease) {
    // TODO: Automatically load previously release name
    console.error("Provide a release name. List available releases with ", ("rock history "+environment).underline, "\n");
    process.exit(1);
  }
  console.log( ("Rolling back to " + targetRelease.bold + " release.").yellow );

  var calls = {};
  _(hosts).each( function(host) {
    var f = function (cb) {
      host.rollback( targetRelease, function(err, results) {
        if (err)
          cb(err);
        else {
          var sshHistory = results[host.name].history;
          var successful = _(sshHistory).every( function(obj) { return obj.status === 'SUCCESS'; });
          cb(null, successful);
        }
      });
    };
    calls[host.name] = f;
  });

  function _allComplete (err, hostMap) {
    if (err) {
      console.log("  => Failure:".red.bold, "Unable to rollback:", err, "\n");
      process.exit(1);
    }
    console.log("\nRollback complete for "+(numHosts==1 ? "1 host" : numHosts+" hosts")+":");
    _.each(hostMap, function(success, hostName) {
      console.log(hostName.bold, "\t", success ? 'SUCCESS'.green.bold : 'FAIL'.red.bold);  
    });
    console.log();
    process.exit(0);
  }

  async.parallel(calls, _allComplete);
}
