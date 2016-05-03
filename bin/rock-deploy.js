#!/usr/bin/env node

var inspect = require("util").inspect;
var program = require("commander");

program
  .arguments("<environment>")
  .option("-f, --force", "Force the deployment to go through")
  .option("-h, --host <name>", "The specific host to target")
  .option("-s, --service <name>", "A specific host service to target")
  .action( function(env) {
    console.log("Deploying to environment:", env);
  });

program.parse(process.argv);
