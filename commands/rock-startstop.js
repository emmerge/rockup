// RockUp
// Commands-StartStop -- Cycle service state within target environment

var Config = require('../lib/Config');

var _ = require('underscore');
var inspect = require('util').inspect;
var Spinner = require('clui').Spinner;

module.exports = StartStopCommand;

function StartStopCommand (program) {

  _.each(["start", "stop", "restart"], function(command) {
    program
      .command(command+" <environment>")
      .description("On host, "+command+" services running this app")
      .option("--host <name>", "The specific host to target")
      .action( function(env, cliOptions) {
        var config = Config._loadLocalConfigFile(env);
        var hosts;
        if (cliOptions && cliOptions.host) 
          hosts = [config.hosts.get(cliOptions.host)];
        else
          hosts = config.hosts.list;

        var gerund = { 'start': 'Starting', 'stop': 'Stopping', 'restart': 'Restarting'}[command];
        var spinner = new Spinner(gerund+' services on '+hosts.length+' host(s)...');
        spinner.start();

        var remain = hosts.length;
        var hostMap = {};
        _.each(hosts, function(host) {
          host[command]( function(result) {
            --remain;
            spinner.message(gerund+' services on '+remain+' host(s)...');
            hostMap[host.name] = result;
            if (remain === 0) {
              spinner.stop();
              console.log("");
              _.each(hostMap, function(result, hostName) {
                console.log(hostName.bold, "\t", inspect(result, {colors:true}).replace("\n", " ") );
              });
              console.log("");
              process.exit(0);
            }
          });
        });

      });
  });

  return program;
}
