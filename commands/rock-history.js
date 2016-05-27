// RockUp
// Commands-History -- Retrieve list of upstream deployment history

var RockUtil = require('./util');
var Config = require('../lib/Config');

module.exports = HistoryCommand;

function HistoryCommand (program) {

  program
    .command("history <environment>")
    .alias("hist")
    .description("Deployment history")
    .action( function(environment) {
      var config = _loadLocalConfigFile(environment);

      var numPending = config.hosts.count;
      var allHosts = config.hosts.map( function(h) { return h.shortName; });
      var allReleases = {};
      config.hosts.each( function(host) {
        host.history( function(err, hostReleases) {
          if (err) { _endCommandCallback(err); }
          else { 
            _.each(hostReleases, function(r) {
              if (allReleases[r])
                allReleases[r].push(host.shortName);
              else
                allReleases[r] = [host.shortName];
            });
          }
          --numPending;
          if (numPending <= 0) {
            //console.log("Releases:", inspect(allReleases));
            console.log("Release            Hosts           ".underline.yellow);
            _.each(allReleases, function(hostNames, releaseName) {
              var note = "";
              if (hostNames.length < allHosts.length)
                note = "* only "+hostNames.join(", ");
              console.log(releaseName," ",note);
            });
            console.log("");
            process.exit(0);
          }
        });
      });

    });

  return program;
}
