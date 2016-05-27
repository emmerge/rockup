// RockUp
// Commands-History -- Retrieve list of upstream deployment history

var RockUtil = require('./util');
var Config = require('../lib/Config');
var inspect = require('util').inspect;
var _ = require('underscore');

module.exports = HistoryCommand;

function HistoryCommand (program) {

  program
    .command("history <environment>")
    .alias("hist")
    .description("Deployment history")
    .action( function(environment) {
      var config = Config._loadLocalConfigFile(environment);
      var releaseMap = {};

      var ops = config.hosts.map( function(host) {
        return function (memo, cb) {
          host.history( function (err, releases) {    // releases: {current: 'releaseName', list: ['name1','name2','name3']}
            if (err) { cb(err); }
            else {
              releases = _.map(releases.list, function(r) { 
                if (r == releases.current)
                  return r+" <=".cyan.bold;
                else
                  return r;
              });
              memo[host.shortName] = releases;
              cb();
            }
          });
        };
      });

      // Receives map of {hostName: [releases]}
      function allHostsComplete ( memo ) {
        _.each(memo, function(releases, hostName) {
          _.each(releases, function(r) {
            if (releaseMap[r])
              releaseMap[r].push(hostName);
            else
              releaseMap[r] = [hostName];
          });
        });

        var finalMap = {};
        _.chain(releaseMap).keys().sort().reverse().each(function(k) { finalMap[k] = releaseMap[k]; });
        console.log("Release            \tHosts           ".underline.yellow);
        _.each(finalMap, function(hostNames, releaseName) {
          var note = "";
          if (hostNames.length < config.hosts.count)
            note = "* only "+hostNames.join(", ");
          console.log(releaseName," \t",note);
        });
        console.log("");
        process.exit(0);
      }

      ops.unshift({}); // memo
      ops.push(allHostsComplete);

      RockUtil.reduceAsync.apply(this, ops);

    });

  return program;
}
