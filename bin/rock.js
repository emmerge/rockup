#!/usr/bin/env node

var program = require("commander");
var colors = require("colors");
var _ = require("underscore");

console.log( ("\nRockUp".green.bold + ": Faceted Meteor Deployments".green).underline, "\n" );

// Define CLI program:
program
  .version("0.0.1")
  .description("Faceted deployment and configuration management for Meteor applications");

// Define sub-commands:
commands = {
  list:       require('../commands/rock-list'),
  lint:       require('../commands/rock-lint'),
  init:       require('../commands/rock-init'),
  prepare:    require('../commands/rock-prepare'),
  deploy:     require('../commands/rock-deploy'),
  rollback:   require('../commands/rock-rollback'),
  startstop:  require('../commands/rock-startstop'),
  status:     require('../commands/rock-status'),
  reconfig:   require('../commands/rock-reconfig'),
  logs:       require('../commands/rock-logs'),
};

// Attach sub-commands:
commands.list(program);
commands.lint(program);
commands.init(program);
commands.prepare(program);
commands.deploy(program);
commands.rollback(program);
commands.startstop(program);

/** history: Retrieve list of deployment history available on hosts **/
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

/** Catch-all for unhandled commands: **/
program
  .command("*", null, {noHelp: true})
  .action( function(command, options) {
    var commandDef = _.findWhere(program.commands, {_name: command});
    if (commandDef)
      console.log("Command", command.underline, "not yet implemented");
    else {
      console.log("No such command", command.underline);
      process.exit(1);
    }
  });

program.parse(process.argv);

