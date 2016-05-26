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
  list:     require('../commands/rock-list'),
  lint:     require('../commands/rock-lint'),
  init:     require('../commands/rock-init'),
  prepare:  require('../commands/rock-prepare'),
  deploy:   require('../commands/rock-deploy'),
};

// Attach sub-commands:
commands.list(program);
commands.lint(program);
commands.init(program);
commands.prepare(program);
commands.deploy(program);


/** rollback: Roll server back to a previously deployed version **/
program
  .command("rollback <environment>")
  .alias("undo")
  .description("Rollback to a previous deployment")
  .option("-r, --release <name>", "Name of release to roll back to (defaults to previous)")
  .action( function(env, options) {
    var targetRelease = options.release;
    if (! targetRelease) {
      targetRelease = "previous";     // TODO: Retrieve most recent release from history
    }
    console.log( "Will rollback to".red, targetRelease.red.bold.underline, "release.".red );
    var config = new _loadLocalConfigFile(env);
    //Deploy.rollback(config);
  });

/** reconfig: Push only configuration changes and restart **/
program
  .command("reconfig <environment>")
  .description("Push configuration only and restart");

/** start, stop, restart: Run start, stop, restart commands against services **/
_.each(["start", "stop", "restart"], function(command) {
  program
    .command(command+" <environment>")
    .option("--host <name>", "The specific host to target")
    .option("--service <name>", "The specific service to target")
    .action( function(env, cliOptions) {
      var config = _loadLocalConfigFile(env);
      _.each(config.hosts.list, function(host) {
        host.services.tasks[command]( _endCommandCallback(command) );
      });
    });
});

/** status: Dislay status informatin for services **/
program
  .command("status <environment>")
  .description("Display a status for services in environment")
  .option("--host <name>", "A specific host to target")
  .option("--service <name>", "A specific service to target")
  .action( function(env, cliOptions) {
    var config = _loadLocalConfigFile(env);
    if ( cliOptions.host ) {
      var host = config.hosts.get( cliOptions.host );
      console.log("Working on host:", host.name);
      host.services.run.status( function(results) {
        console.log("Results:\n", inspect(results, {colors:true, depth:null}));
        process.exit(0);
      });

    } else {
      console.log("Can't do it for everyone, yet. Pass a --host");
    }

  });

/** logs: Tail service logs from hosts **/
program
  .command("logs <environment>")
  .description("Tail service logs");

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

