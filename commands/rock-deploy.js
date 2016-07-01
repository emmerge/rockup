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
    .on("--help", function() {
      console.log("  Examples:\n");
      console.log("    $ rock deploy production           # Deploy to production environment");
      console.log("    $ rock deploy produciton --series  # Deploy to hosts one-by-one");
      console.log("\n  Build Notes:\n");
      console.log("    You can provide the path to a Meteor app bundle on the command-line");
      console.log("    using the "+"--bundle".cyan+" switch. Bundles provided should be the result of");
      console.log("    a `meteor build` command, tarred and gzipped.\n");
      console.log("    If you do not provide a bundle, the deploy command will build the app");
      console.log("    for you as the first step of the process. By default, the app will be");
      console.log("    built against your local machine's architecture. However, in your");
      console.log("    "+"rockup.json".cyan+" file, you may specify the "+"app.arch".cyan+" setting to target a");
      console.log("    different architecture (arch options can be learned in the meteor build");
      console.log("    command help).");
      console.log("\n  Deploy Notes:\n");
      console.log("    By default, rockup will deploy to each of your host servers in parallel.");
      console.log("    This can be overridden if you have debugging concerns or need to throttle");
      console.log("    at-once network usage by using the "+"--series".cyan+" switch. When set,");
      console.log("    RockUp will deploy to each host one-by-one. This can also be helpful for");
      console.log("    generating more predictable rolling restarts.");
      console.log();
    })
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
            console.log("\n => Success!".green.bold, "Deployed to hosts:", results.successful.join(', '), "\n");
            process.exit(0);
          }
        });
    });

  return program;
}
