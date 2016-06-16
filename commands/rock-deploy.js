// RockUp
// Commands-Deploy -- Push code and configuration to target servers

var Config = require('../lib/Config');
var Deploy = require('../lib/Deploy');

module.exports = DeployCommand;

function DeployCommand (program) {
  program
    .command("deploy <environment>")
    .description("Deploy application to environment")
    .option("-H, --host <name>", "The specific host to target")
    .option("--bundle <path>", "Deploy a bundle.tar.gz already in-hand")
    .option("--series", "Deploy to hosts in series (default is parallel deployment)")
    .action( function(env, cliOptions) {
        var config = Config._loadLocalConfigFile(env);
        cliOptions = cliOptions || {};
        var options = {};
        if ( cliOptions.host )
          options.hosts = [cliOptions.host];            // Target a single host
        if ( cliOptions.bundle )
          options.bundle = cliOptions.bundle;           // Use an already-tarred app bundle
        options.mode = cliOptions.series ? 'series' : 'parallel';
        
        var deployment = new Deploy(config, options);
        deployment.push( function(err, results) {
          var completeButFailed = results && results.failed && results.failed.length > 0;
          if (err) {
            // Unhandled error occurred:
            console.log("  => Failure:".red.bold, "Error deploying:", err, "\n");
            process.exit(1);
          } else if (completeButFailed) {
            // Commands completed, but partial failure in deployment:
            console.log("  => Failure:".red.bold, "Failed to deploy to:", results.failed.join(', '), "\n");
            process.exit(1);
          } else {
            // Successful deployment to all hosts:
            console.log("\nSucceessfully deployed to", results.successful.join(', '));
            process.exit(0);
          }
        });
    });

  return program;
}
