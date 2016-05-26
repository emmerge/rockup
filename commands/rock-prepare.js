// RockUp
// Commands-Prepare -- Prepare the server-side to accept deployments

var Config = require('../lib/Config');
var RockUtil = require('./util');

module.exports = PrepareCommand;

function PrepareCommand (program) {
  program
    .command("prepare <environment>")
    .alias("prep")
    .description("Prepare a server host to accept deployments")
    .action( function(env, options) {
      var config = Config._loadLocalConfigFile(env);
      console.log("Preparing "+config.hosts.count+" host(s) for deployment:", config.hosts.names);
      config.hosts.each( function(host) {
        host.prepare( RockUtil._endCommandCallback("Preparation") );
      });
      console.log("");
    });
  return program;
}
