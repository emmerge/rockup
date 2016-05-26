// RockUp
// Commands-Lint -- Display details and check for errors in a RockUp file

var inspect = require('util').inspect;
var Config = require('../lib/Config');

module.exports = LintCommand;

function LintCommand (program) {
  program
    .command("lint <environment>")
    .description("Check configuration file for issues")
    .action( function(env, cliOptions) {
      var config = Config._loadLocalConfigFile(env);
      console.log("Configuration:\n", inspect(config, {colors:true, depth:null}));
      console.log("app:", config.app);
      console.log("appName:", config.app.name);
      console.log("appPath:", config.app.path);
      console.log("hosts.list:", config.hosts.list);
      console.log("hosts.names:", config.hosts.names);
      console.log("host.get():", config.hosts.get('dev2.emmerge.com'));
      console.log("host.sshOptions():", config.hosts.get('dev2.emmerge.com').sshConfig());
      console.log("services:", config.services('dev2.emmerge.com'));
      console.log("service:", config.service('dev2.emmerge.com', 'bennett-1'));
      console.log("host.services.tasks.status:", config.hosts.get('dev2.emmerge.com').services.tasks.status());
    });

  return program;
}
