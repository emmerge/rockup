#!/usr/bin/env node

var inspect = require("util").inspect;
var program = require("commander");

console.log("RockUp");

program
  .arguments("<subcommand>")
  .option("-p, --project <name>", "The project to manage")
  .action( function(subcommand) {
    console.log("Performing Command:", subcommand, "\nAgainst Project:", program.project);
  })
  .parse(process.argv);


