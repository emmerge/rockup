// RockUp
// Commands-Deploy -- Push code and configuration to target servers

var RockUtil = require('./util');
var Config = require('../lib/Config');
var Deploy = require('../lib/Deploy');

module.exports = DeployCommand;

function DeployCommand (program) {
  program
    .command("deploy <environment>")
    .alias("push")
    .description("Deploy application to environment")
    .option("--host <name>", "The specific host to target")
    .option("--bundle <path>", "Deploy a bundle.tar.gz already in-hand")
    .action( function(env, cliOptions) {
        var config = Config._loadLocalConfigFile(env);
        cliOptions = cliOptions || {};
        var options = {};
        if ( cliOptions.host )
          options.hosts = [cliOptions.host];            // Target a single host
        if ( cliOptions.bundle )
          options.bundle = cliOptions.bundle;           // Use an already-tarred app bundle
        var deployment = new Deploy(config, options);
        deployment.push( RockUtil._endCommandCallback("Deployment") );
    });

  return program;
}
