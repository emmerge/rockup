#!/usr/bin/env node

var inspect = require("util").inspect;
var program = require("commander");

console.log("RockUp");

program
  .version("0.0.1")
  .description("Faceted deployment and configuration management for Meteor applications")
  .command("test", "Display test output")
  .command("deploy [environment]", "Deploy application to environment")
  .command("prepare <environment>", "Prepare a server host to accept deployments");

program.parse(process.argv);
