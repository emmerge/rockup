#!/usr/bin/env node

var inspect = require("util").inspect;
var program = require("commander");
var colors = require("colors");

console.log("\nRockUp".green.bold + ": Faceted Meteor Deployments".green);
console.log("----------------------------------".green+"\n");

program
  .version("0.0.1")
  .description("Faceted deployment and configuration management for Meteor applications")
  .command("deploy [environment]", "Deploy application to environment")
  .command("init [app] [environment]", "Initialize a local configuration")
  .command("prepare [environment]", "Prepare a server host to accept deployments");

// console.log("Program:\n", inspect(program, {colors: true, depth: null}));

program.parse(process.argv);
