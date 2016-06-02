// RockUp
// Commands-Prepare -- Prepare the server-side to accept deployments

var Spinner = require('clui').Spinner;
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

      var spinner = new Spinner('Preparing '+config.hosts.count+' host(s) for deployment...  ');
      spinner.start();

      config.hosts.each( function(host) {
        console.log(" -", host.name, "...");
        host.prepare( RockUtil._endCommandCallback("Preparation") );
        // TODO: callback should only be fired after ALL servers have been prepped
      });
      spinner.stop();
      console.log("");
    });
  return program;
}
