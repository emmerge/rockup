// RockUp
// Commands-Init -- Initialize a local RockUp environment configuration

var Config = require('../lib/Config');

module.exports = InitCommand;

function InitCommand (program) {
  program
    .command("init <environment> <appName>")
    .option("-p, --path <path>", "Path to app relative to ./deploy")
    // .option("--upstart", "Add upstart configuration template")
    // .option("--nginx", "Add nginx configuration template")
    .description("Initialize a local configuration.")
    .on("--help", function(){
      console.log("  Examples:\n");
      console.log("    $ rock init production myapp                  # Basic myapp production config");
      console.log("    $ rock init staging MyApp --path /src/myapp   # Config with path to app dir\n");
    })
    .action( function(environment, appName, cliOptions) {
      console.log("Creating local rockup configs for", environment.cyan, "environment");
      var files = ['rockup','meteor'];  // TODO: upstart, nginx
      // if (cliOptions.upstart) files.push('upstart');
      // if (cliOptions.nginx) files.push('nginx');
      var appPath = cliOptions.path;
      Config.initialize(environment, files, appName, appPath);
      console.log();
    });

  return program;
}