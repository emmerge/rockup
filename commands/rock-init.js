// RockUp
// Commands-Init -- Initialize a local RockUp environment configuration

var Config = require('../lib/Config');

module.exports = InitCommand;

function InitCommand (program) {
  program
    .command("init <environment>")
    .description("Initialize a local configuration")
    .option("--upstart", "Add upstart configuration template")
    .option("--nginx", "Add nginx configuration template")
    .action( function(env, options) {
      console.log("Creating local rockup configs for ", env.cyan, "environment");
      var files = ['rockup','meteor'];  // upstart, nginx
      if (options.upstart) files.push('upstart');
      if (options.nginx) files.push('nginx');
      Config.initialize(env, files);
    });

  return program;
}