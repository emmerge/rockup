// RockUp
// Commands-Prepare -- Prepare the server-side to accept deployments

var Config = require('../lib/Config');
var reduceAsync = require('../lib/Async').reduce;

module.exports = PrepareCommand;

function PrepareCommand (program) {
  program
    .command("prepare <environment>")
    .alias("prep")
    .description("Prepare a server host to accept deployments")
    .option("--host <name>", "Specify an individual host to prep")
    .action( function(env, cliOptions) {
      var config = Config._loadLocalConfigFile(env);

      var hosts;
      if ( cliOptions.host ) {
        var host = config.hosts.get(cliOptions.host);
        if (!host) {
          console.error("Cannot find host:".red.bold, cliOptions.host, "\n");
          process.exit(1);
        }
        hosts = [host];
      } else {
        hosts = config.hosts.list;
      }
      var numHosts = hosts.length;

      var operations = _.map(hosts, function(host) {
        return function (memo, cb) {
          host.prepare( function(results) {
            if (results[host.name].error)
              memo[host.name] = false;
            else
              memo[host.name] = _.every(results[host.name].history, function(obj) {
                return obj.status === 'SUCCESS';
              });
            cb();
          });
        };
      });

      function _allHostsComplete (hostMap) {
        console.log("\nPreparation complete for "+numHosts+" host(s):");
        _.each(hostMap, function(success, hostName) {
          console.log(hostName.bold, "\t", success ? 'SUCCESS'.green.bold : 'FAIL'.red.bold);  
        });
        console.log("");
        process.exit(0);
      }

      operations.unshift({});
      operations.push(_allHostsComplete);
      reduceAsync.apply(this, operations);
      
    });
  return program;
}
