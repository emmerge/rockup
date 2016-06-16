// RockUp
// Commands-Reconfig -- Push configuration only and restart services

var Config = require('../lib/Config');
var Deploy = require('../lib/Deploy');

module.exports = ReconfigCommand;

function ReconfigCommand (program) {

  program
    .command("reconfig <environment>")
    .option("-H, --host <name>", "Reconfigure a specific host")
    .description("Change live configuration and restart")
    .action( function(environment, cliOptions) {
        var config = Config._loadLocalConfigFile(environment);
        cliOptions = cliOptions || {};
        var options = {};
        if ( cliOptions.host )
          options.hosts = [cliOptions.host];            // Target a single host
        
        var deployment = new Deploy(config, options);
        deployment.reconfigure( function(err, results) {
          console.log("\nReconfigure complete", results.successful.join(', '));
          console.log( inspect(results, {colors:true, depth:null}) );
          if (results.failed.length === 0) {
            console.log("Reconfiguration succeeded!\n".green.bold);
            process.exit(0);
          } else {
            console.log("Failed to reconfigure", results.failed.join(', '));
            console.log("Reconfiguration failed!\n".red.bold);
            process.exit(1);
          }
        });
    });

  return program;
}
