// RockUp
// Commands-History -- Retrieve list of upstream deployment history

var Config = require('../lib/Config');
var Deploy = require('../lib/Deploy');
var _getHosts = require('../commands/util')._getHosts;

var async = require('async');
var Spinner = CLUI.Spinner;
var Line = CLUI.Line;

module.exports = HistoryCommand;

function HistoryCommand (program) {

  program
    .command("history <environment>")
    .option("-H, --host <name>", "Limit history lookup to single host")
    .option("--all", "Only list releases available on all hosts")
    // .option("--current", "Return only the name of the current release")
    // .option("--previous", "Return only the name of the release prior to current")
    .description("View deployment history")
    .on("--help", function(){
      console.log("  Examples:\n");
      console.log("    $ rock history production          # List all releases");
      console.log("    $ rock history staging --all       # List only releases on all hosts");
      console.log("    $ rock history --current           # Output current release");
      console.log("\n  Notes:\n");
      console.log("    History can vary per-host in multi-host environments. Use the --all");
      console.log("    flag to limit output to releases that are eligible for rollback on");
      console.log("    all hosts.\n");
      console.log("    The --current and --previous flags imply --all unless used in");
      console.log("    conjunction with --host");
      console.log();
    })
    .action( _gatherHistory );

  return program;
}


/**
 * Perform the history operation.
 *
 * @params {String} environment       The RockUp environment name
 * @params {Object} cliOptions        The Commander CLI options
 **/
function _gatherHistory(environment, cliOptions) {
  var config = Config._loadLocalConfigFile(environment);
  var hosts = _getHosts(config, cliOptions);
  var numHosts = hosts.length;

  var spinner = new Spinner("Pulling history from "+(numHosts==1 ? "1 host" : numHosts+" hosts")+"...");
  spinner.start();

  // Gather an array of
  var calls = {};
  _(hosts).each( function(host) {
    var f = function(cb) {
      host.history( function(err, hostReleases) {
        --numHosts;
        spinner.message("Pulling history from "+(numHosts==1 ? "1 host" : numHosts+" hosts")+"...");
        if (err) { 
          cb(err); 
        } else {
          var releases = _.map(hostReleases.list, function(releaseName) {
            var rInfo = { name: releaseName };
            if (releaseName == hostReleases.current) { rInfo.current = true; }
            return rInfo;
          });
          cb(null, releases);
        }
      });
    };
    calls[host.name] = f;
  });

  // Completion function receives an Object with hostname keys and lists of
  // releases as values. Each release: name: 'r20160610', current: true }
  function _allComplete ( err, hostMap ) {
    spinner.stop();
    if (err) {
      console.log("  => Failure:".red.bold, "Unable to load history:", err, "\n");
      process.exit(1);
    }

    var releaseList;
    if (cliOptions.all)
      releaseList = _.sortBy( _onlyOnAllHosts(hostMap, _(hosts).pluck('name')), 'name' ).reverse();
    else
      releaseList = _.sortBy( _onAnyHost(hostMap), 'name' ).reverse();

    if (releaseList.length === 0) {
      console.log( ("No releases found on "+_(hostMap).keys().join(", ")).yellow.bold);
      console.log("Has "+("rock prep "+environment).underline+" been run?");
      console.log();
      process.exit(1);
    }

    var nowName = "r"+Deploy._nowStamp();
    console.log("A release deployed now would be named "+nowName.cyan+"\n");

    var headers = new Line()
      .padding(2)
      .column("Release".yellow.bold.underline, 24)
      .column("Hosts".yellow.bold.underline, 40)
      .fill()
      .output();

    _.each(releaseList, function(rInfo) {
      var releaseName = rInfo.name;
      var displayName = rInfo.current ? releaseName.cyan.bold : releaseName;
      var hostsNote = "All  ("+rInfo.hosts.length+")";
      if ( hosts.length > rInfo.hosts.length ) {
        // At least 1 env host does not have this release
        displayName = displayName.italic;
        var hostShortNames = _(rInfo.hosts).map(function(hn) { return hn.split('.')[0]; });
        hostsNote = "Some ("+rInfo.hosts.length+") "+hostShortNames.join(", ").dim;
      }
      var line = new Line()
        .padding(2)
        .column(displayName, 24)
        .column(hostsNote, 40)
        .fill()
        .output();
    });

    console.log();
    process.exit(0);
  }

  async.parallel(calls, _allComplete);
}


/**
 * Given an Object of { hostName: [ releases ] }, return a list of
 * releases that are present on _every_ host.
 *
 * @param {Object} hostMap      Map of host name => array of releases
 * @param {Array} hostNames     Array of all present host names
 * @returns {Array} Releases present on all hosts
 **/
function _onlyOnAllHosts(hostMap, hostNames) {
  var allReleases = _onAnyHost(hostMap);
  return _(allReleases).reject(function(r) {
    return r.hosts.length < hostNames.length;
  });
}

/**
 * Given an Object of { hostName: [ releases ] }, return a list of 
 * every release, even those only on a subset of hosts.
 *
 * @param {Object} hostMap      Map of host name => array of releases
 * @returns {Array} List of releases
 **/
function _onAnyHost(hostMap) {
  var allReleases = [];
  _(hostMap).each( function(releases, hostName) {
    _(releases).each( function(r) {
      var exist = _(allReleases).findWhere({name: r.name});
      if (exist)
        exist.hosts = _.union(exist.hosts, [hostName]);
      else
        allReleases.push( _(r).extend({hosts: [hostName]}) );
    });
  });
  return allReleases;
}
