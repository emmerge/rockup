// RockUp
// Commands-Logs -- Tail service logs

var path = require('path');
var Config = require('../lib/Config');

module.exports = LogsCommand;

function LogsCommand (program) {
  program
    .command("logs <environment>")
    .description("Tail service logs")
    .option("-H, --host <name>", "Tails logs on an individual host")
    .option("-S, --service <name>", "Limits output to one running service")
    .action( function(environment, cliOptions) {
      var config = Config._loadLocalConfigFile(environment);

      var hosts;
      if ( cliOptions.host ) {
        var host = config.hosts.get(cliOptions.host);
        if (!host) {
          console.error("Cannot find host:".red.bold, cliOptions.host, "\n");
          process.exit(1);
        }
        hosts = [host];
      } else {
        hosts = config.hosts.list;
      }

      var limitService = cliOptions.service;

      console.log("Tailing hosts:", _.pluck(hosts, 'name').join(', '));
      console.log("Tailing services:", limitService || 'all');

      _.each(hosts, function(host) {
        var session = host.sshSession({keepAlive: false});
        var serviceNames = limitService ? [limitService] : host.services.names;
        _tailLogs(session, "-F", serviceNames);
      }); // hosts

    });

  return program;
}

/**
 * Given an array of service names, connect to and tail the logs
 * for all services simultaneously.
 *
 * @param {Session} session       Nodemiral session to host
 * @param {String} tailOptions    Command args to tail on server
 * @param {Array} serviceNames    Names of Rock services to tail logs
 **/
function _tailLogs (session, tailOptions, serviceNames) {
  var fileNames = _(serviceNames).map( function(sn) { 
    return path.resolve("/var/log/upstart", sn+".log");
  });
  var pathList = fileNames.join(' ');

  var tailParts = ['sudo', 'tail', tailOptions, pathList];
  var tailCommand = tailParts.join(' ');

  session.execute(tailCommand, {
    onStdout: function(data) {
      if (data.toString())
        process.stdout.write(data.toString());
    },
    onStderr: function(data) {
      if (data.toString())
        process.stderr.write(data.toString());
    }
  }); // execute
}
