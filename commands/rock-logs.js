// RockUp
// Commands-Logs -- Tail service logs

var Config = require('../lib/Config');

module.exports = LogsCommand;

function LogsCommand (program) {
  program
    .command("logs <environment>")
    .description("Tail service logs")
    .option("-H, --host <name>", "Tails logs on an individual host")
    .option("--service <name>", "Limits output to one running service")
    .action( function(environment, cliOptions) {
      var config = Config._loadLocalConfigFile(environment);
      var tailOptions = "-F -n50";

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
        host.services.each( function(service) {
          if (limitService && service.name !== limitService)
            return;
          var prefix = "["+host.name+":".white+service.name.cyan+"] ";
          var tailCommand = "sudo tail "+tailOptions+" /var/log/upstart/"+service.name+".log";
          session.execute(tailCommand, {
            onStdout: function(data) {
              if (data.toString())
                process.stdout.write("\n" + prefix.magenta + data.toString());
            },
            onStderr: function(data) {
              if (data.toString())
                process.stderr.write("\n" + prefix.magenta + data.toString());
            }
          }); // execute
        }); // services
      }); // hosts

    });

  return program;
}
