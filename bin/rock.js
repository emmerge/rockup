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
  history:    require('../commands/rock-history')
};

// Attach sub-commands:
commands.list(program);
commands.lint(program);
commands.init(program);
commands.prepare(program);
commands.deploy(program);
commands.rollback(program);
commands.startstop(program);
commands.status(program);
commands.reconfig(program);
commands.logs(program);
commands.history(program);

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

