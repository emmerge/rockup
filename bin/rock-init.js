#!/usr/bin/env node

var program = require("commander");
var colors = require("colors");

var Config = require("../lib/Config");

program
  .arguments("<app> <environment>")
  .option("--skip-upstart", "Don't include upstart configuration")
  .option("--skip-nginx", "Don't include nginx configuration")
  .action( function(appName, environment) {
    console.log("Creating", environment.cyan, "rockup file for", appName.cyan, "app");

    Config.initialize(appName, environment);

    // TODO: Upstart configuration template copy
    // TODO: Nginx configuration template copy

  });

program.parse(process.argv);
