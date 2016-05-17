#!/usr/bin/env node

var program = require("commander");
var inspect = require("util").inspect;
var colors = require("colors");
var _ = require("underscore");

var Config = require("../lib/Config");
var Host = require("../lib/Host");
var Deploy = require("../lib/Deploy");

console.log( ("\nRockUp".green.bold + ": Faceted Meteor Deployments".green).underline );

/** Define RockUp CLI **/
program
  .version("0.0.1")
  .description("Faceted deployment and configuration management for Meteor applications");


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
    var config = new Config(env);
    var hostNames = config.hostNames();
    console.log("Will prepare "+hostNames.length+" host(s) for deployment:", inspect(hostNames));
    _.each( hostNames, function(hostName) {
      var host = new Host(config, hostName);
      host.prepare();
    });
  });

/** deploy: Push code and configuration to server(s) **/
program
  .command("deploy <environment>")
  .alias("push")
  .description("Deploy application to environment")
  .option("-h, --host <name>", "The specific host to target")
  .option("-s, --service <name>", "A specific host service to target")
  .option("-f, --force", "Force the deployment to go through")
  .action( function(env, options) {
      var config = new Config(env);
      var deployment = new Deploy(config);
      deployment.push();
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
    var config = new Config(env);
    //Deploy.rollback(config);
  });

/** reconfig: Push only configuration changes and restart **/
program
  .command("reconfig <environment>")
  .description("Push configuration only and restart");

/** ps: Run status, start, stop, restart commands against services **/
program
  .command("ps <cmd> <environment>")
  .description("Status, Start, Stop, Restart service processes");

/** logs: Tail service logs from hosts **/
program
  .command("logs <environment>")
  .description("Tail service logs");

/** history: Retrieve list of deployment history available on hosts **/
program
  .command("history <environment>")
  .alias("hist")
  .description("Deployment history");

/** Catch-all for unhandled commands: **/
program
  .command("*")
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
