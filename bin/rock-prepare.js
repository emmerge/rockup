#!/usr/bin/env node

var inspect = require("util").inspect;
var program = require("commander");

program
  .arguments("<environment>")
  .option("--skip-upstart", "Don't include upstart configuration")
  .option("--skip-nginx", "Don't include nginx configuration")
  .action( function(env) {
    console.log("Preparing environment:", env);
  });

program.parse(process.argv);
