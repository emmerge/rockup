// RockUp
// Commands-History -- Retrieve list of upstream deployment history

var reduceAsync = require("../lib/Async").reduce;
var Config = require('../lib/Config');

var Spinner = CLUI.Spinner;
var Line = CLUI.Line;

module.exports = HistoryCommand;

function HistoryCommand (program) {

  program
    .command("history <environment>")
    .option("--host <name>", "Limit history lookup to single host")
    .description("View available deployment history")
    .action( function(environment, cliOptions) {
      var config = Config._loadLocalConfigFile(environment);

      var hosts = cliOptions.host ? [config.hosts.get(cliOptions.host)] : config.hosts.list;
      var numHosts = hosts.length;

      var spinner = new Spinner('Pulling history from '+numHosts+' host(s)...');
      spinner.start();

      var releaseMap = {};

      var ops = _.map(hosts, function(host) {
        return function (memo, cb) {
          host.history( function (err, hostReleases) {    // releases: {current: 'releaseName', list: ['name1','name2','name3']}
            --numHosts;
            spinner.message('Pulling history from '+numHosts+' host(s)...');
            if (err) { cb(err); }
            else {
              _.each(hostReleases.list, function(releaseName) {
                var rInfo = { name: releaseName, host: host.name };
                if (releaseName == hostReleases.current) { rInfo.current = true; }
                memo.push( rInfo );
              });
              cb();
            }
          });
        };
      });

      // Completion function receives array releases that will contain
      // duplicates. Items in array formatted like:
      // [ { name: 'r20160610_631983', current: true, host: 'app1.com' }, ... ]
      function allHostsComplete ( allReleases ) {
        var releaseMap = {};
        _.each(allReleases, function(rInfo) {
          if ( releaseMap[rInfo.name] ) {
            // Release duplicate. Merge:
            releaseMap[rInfo.name].hosts.push( config.hosts.get(rInfo.host).shortName );
            releaseMap[rInfo.name].hosts = releaseMap[rInfo.name].hosts.sort();
            if (rInfo.current) releaseMap[rInfo.name].current = rInfo.current;
          } else {
            // Unseen release. Insert:
            rInfo.hosts = [ config.hosts.get(rInfo.host).shortName ];
            delete rInfo.host;
            releaseMap[rInfo.name] = _(rInfo).omit('name');
          }
        });

        spinner.stop();
        var headers = new Line()
          .padding(2)
          .column("Release".yellow.bold.underline, 24)
          .column("Hosts".yellow.bold.underline, 40)
          .fill()
          .output();

        _.each(releaseMap, function(rInfo, releaseName) {
          var displayName = rInfo.current ? releaseName.cyan.bold : releaseName;
          var hostsNote = "All  ("+rInfo.hosts.length+")";

          if ( hosts.length > rInfo.hosts.length ) {
            // At least 1 env host does not have this release
            displayName = displayName.italic;
            hostsNote = "Some ("+rInfo.hosts.length+") "+rInfo.hosts.join(", ").dim;
          }

          var line = new Line()
            .padding(2)
            .column(displayName, 24)
            .column(hostsNote, 40)
            .fill()
            .output();
        });

        console.log("  * currents highlighted".dim, "\n");
        process.exit(0);
      }

      ops.unshift([]); // memo
      ops.push(allHostsComplete);

      reduceAsync.apply(this, ops);

    });

  return program;
}
