#!/usr/bin/env node

var program = require("commander");
var colors = require("colors");

var Config = require("../lib/Config");

program
  .arguments("<app> <environment>")
  .option("--upstart", "Add upstart configuration template")
  .option("--nginx", "Add nginx configuration template")
  .action( function(appName, environment) {
    
    console.log("Creating", environment.cyan, "rockup file for", appName.cyan, "app");
    var files = ['rockup','meteor'];  // upstart, nginx
    if (this.upstart)
      files.push('upstart');
    if (this.nginx)
      files.push('nginx');
    Config.initialize(appName, environment, files);

  });

program.parse(process.argv);
