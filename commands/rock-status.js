// RockUp
// Commands-Status -- Load stopped/running state for services

var RockUtil = require('./util');
var Config = require('../lib/Config');

module.exports = StatusCommand;

function StatusCommand (program) {

  program
    .command("status <environment>")
    .description("Display status for running/stopped services")
    .option("--host <name>", "A specific host to target")
    .option("--service <name>", "A specific service to target")
    .action( function(env, cliOptions) {
      var config = Config._loadLocalConfigFile(env);
      if ( cliOptions.host ) {
        var host = config.hosts.get( cliOptions.host );
        console.log("Working on host:", host.name);
        host.services.run.status( function(results) {
          console.log("Results:\n", inspect(results, {colors:true, depth:null}));
          process.exit(0);
        });

      } else {
        console.log("Can't do it for everyone, yet. Pass a --host");
      }

    });

  return program;
}
