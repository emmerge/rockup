#!/usr/bin/env node

program = require('commander');
CLUI = require('clui');
colors = require('colors');
_ = require('underscore');
inspect = require('util').inspect;

var version = require('../package.json').version;

// Define CLI program:
program
  .version( version )
  .description("Faceted deployment and configuration management for Meteor applications");

// Define and attach sub-commands:
require('../commands/rock-init') (program);
require('../commands/rock-prepare') (program);
require('../commands/rock-deploy') (program);
require('../commands/rock-history') (program);
require('../commands/rock-rollback') (program);
require('../commands/rock-startstop') (program);
require('../commands/rock-status') (program);
require('../commands/rock-reconfig') (program);
require('../commands/rock-logs') (program);
require('../commands/rock-list') (program);
require('../commands/rock-info') (program);

// Explicit subcommand help
program
  .command('help [command]')
  .description("Display usage and help for commands")
  .action( function(command) {
    var commandDef = command ? _.findWhere(program.commands, {_name: command}) : null;
    if (command && commandDef)
      _commandHelp(command);
    else 
      _myHelp();
  });

console.log();
if (process.argv.length > 2) {
  program.parse(process.argv);
} else {
  _title("Usage");
  program.help();
}

function _title (sub) {
  console.log("RockUp".green.bold, sub ? sub.bold : '');
}

function _myHelp () {
  _title("General Help");
  program.help();
}

function _commandHelp (command) {
  _title("rock-"+command);
  require('child_process').spawn("rock", [command, "-h"], {stdio: [process.stdin, process.stdout, process.stderr] });
}