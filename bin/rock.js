#!/usr/bin/env node

var inspect = require("util").inspect;
var program = require("commander");
var colors = require("colors");

console.log( ("\nRockUp".green.bold + ": Faceted Meteor Deployments".green).underline );
//console.log("----------------------------------".green+"\n");

program
  .version("0.0.1")
  .description("Faceted deployment and configuration management for Meteor applications")
  .command("init <app> <environment>", "Initialize a local configuration")
  .command("prepare <environment>", "Prepare a server host to accept deployments")
  .command("deploy <environment>", "Deploy application to environment")
  .command("rollback <environment>", "Rollback to previous deployment")
  .command("reconfig <environment>", "Push configuration only and restart")
  .command("ps <cmd> <environment>", "Status, Start, Stop, Restart service processes")
  .command("logs <environment>", "Tail service logs")
  .command("hist <environment>", "Deployment history");

// console.log("Program:\n", inspect(program, {colors: true, depth: null}));

program.parse(process.argv);
