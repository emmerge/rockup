#!/usr/bin/env node

var inspect = require("util").inspect;
var program = require("commander");

console.log("RockUp");

program
  .version("0.0.1")
  .command('help [command]', 'Display help for a subcommand information', {isDefault: true})
  .command('init [environment]', 'Initialize your local rockup configuration')
  .command('prepare [environment]', 'Prepare hosts and services')
  .command('deploy [environment]', 'Push updated software and configuration')
  .command('configure [environment]', 'Push updated configuration only')  
  //.arguments("<subcommand>")
  .option("-h, --host <name>", "The specific host to target")
  .option("-s, --service <name>", "A specific host service to target")
  .action( function() {
    console.log("Rockup's program:\n", inspect(program));
  })
  .parse(process.argv);


