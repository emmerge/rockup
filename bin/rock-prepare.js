#!/usr/bin/env node

var inspect = require("util").inspect;
var program = require("commander");

program
  .arguments("[environment]")
  .action( function(env) {
    console.log("Preparing environment:", env);
  });

program.parse(process.argv);
