// RockUp
// Commands-StartStop -- Cycle service state within target environment

var RockUtil = require('./util');
var Config = require('../lib/Config');

var _ = require('underscore');

module.exports = StartStopCommand;

function StartStopCommand (program) {

  _.each(["start", "stop", "restart"], function(command) {
    program
      .command(command+" <environment>")
      .option("--host <name>", "The specific host to target")
      .option("--service <name>", "The specific service to target")
      .action( function(env, cliOptions) {
        var config = Config._loadLocalConfigFile(env);
        config.hosts.each( function(host) {
          host.services.run[command]( RockUtil._endCommandCallback(command) );
        });
      });
  });

  return program;
}
