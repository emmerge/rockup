#!/usr/bin/env node

var program = require("commander");
var inspect = require("util").inspect;
var colors = require("colors");
var path = require("path");
var _ = require("underscore");

var Config = require("../lib/Config");
var Host = require("../lib/Host");
var Deploy = require("../lib/Deploy");
var Service = require("../lib/Service");

console.log( ("\nRockUp".green.bold + ": Faceted Meteor Deployments".green).underline, "\n" );

/** Define RockUp CLI **/
program
  .version("0.0.1")
  .description("Faceted deployment and configuration management for Meteor applications");

commands = {
  list: require('../commands/rock-list'),
  lint: require('../commands/rock-lint')
};

commands.list(program);
commands.lint(program);

/** init: Initializes local configuration **/
program
  .command("init <environment>")
  .description("Initialize a local configuration")
  .option("--upstart", "Add upstart configuration template")
  .option("--nginx", "Add nginx configuration template")
  .action( function(env, options) {
    console.log("Creating local rockup configs for ", env.cyan, "environment");
    var files = ['rockup','meteor'];  // upstart, nginx
    if (options.upstart) files.push('upstart');
    if (options.nginx) files.push('nginx');
    Config.initialize(env, files);
  });

/** prepare: Preps server to accept deployments **/
program
  .command("prepare <environment>")
  .alias("prep")
  .description("Prepare a server host to accept deployments")
  .action( function(env, options) {
    var config = _loadLocalConfigFile(env);
    var hostNames = config.hostNames();
    console.log("Will prepare "+hostNames.length+" host(s) for deployment:", inspect(hostNames));
    _.each( hostNames, function(hostName) {
      var host = new Host(config, hostName);
      host.prepare( _endCommandCallback("Preparation") );
    });
  });

/** deploy: Push code and configuration to server(s) **/
program
  .command("deploy <environment>")
  .alias("push")
  .description("Deploy application to environment")
  .option("--host <name>", "The specific host to target")
  .option("--bundle <path>", "Deploy a bundle.tar.gz already in-hand")
  .action( function(env, cliOptions) {
      var config = _loadLocalConfigFile(env);
      cliOptions = cliOptions || {};
      var options = {};
      if ( cliOptions.host )
        options.hosts = [cliOptions.host];            // Target a single host
      if ( cliOptions.bundle )
        options.bundle = cliOptions.bundle;           // Use an already-tarred app bundle
      var deployment = new Deploy(config, options);
      deployment.push( _endCommandCallback("Deployment") );
  });

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


/**
 * Generate a callback function to be used in the CLI context as a
 * callback passed to delayed result commands. The returned function
 * accepts error as the first argument and exits the process with
 * a error code of non-zero for error, zero for success.
 *
 * @param {String} commandName      Name to use in status messages
 * @returns {Function}              Callback 
 **/
function _endCommandCallback (commandName) {
  return function(err) {
    if (err) {
      console.log( (commandName+" failed:").red.bold, inspect(err).red );
      process.exit(1);
    }
    else {
      console.log( (commandName+" succeeded!").green.bold );
      process.exit(0);
    }
  };
}
