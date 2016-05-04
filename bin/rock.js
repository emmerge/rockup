#!/usr/bin/env node

var inspect = require("util").inspect;
var program = require("commander");
var colors = require("colors");

console.log("\nRockUp".green.bold + ": Faceted Meteor Deployments".green);
console.log("----------------------------------".green);

program
  .version("0.0.1")
  .description("Faceted deployment and configuration management for Meteor applications")
  .command("test", "Display test output")
  .command("deploy [environment]", "Deploy application to environment")
  .command("prepare <environment>", "Prepare a server host to accept deployments");

program.parse(process.argv);
