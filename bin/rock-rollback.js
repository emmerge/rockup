#!/usr/bin/env node

var inspect = require("util").inspect;
var program = require("commander");

var Config = require("../lib/Config.js");
var Deploy = require("../lib/Deploy.js");

program
  .arguments("<environment>")
  .option("-r, --release <name>", "Name of on-server release to roll back to (defaults to previous)")
  .action( function(env) {
    var targetRelease = this.release;
    if (! targetRelease) {
      // TODO: Retrieve most recent release from history
      targetRelease = "previous";
    }

    console.log( "Will rollback to".red, targetRelease.red.bold.underline, "release.".red );

    var config = new Config(env);
    //Deploy.rollback(config);
  });

program.parse(process.argv);
