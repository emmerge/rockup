#!/usr/bin/env node

var program = require("commander");

program
  .alias("create")
  .arguments("[app] [environment]")
  .option("--skip-upstart", "Don't include upstart configuration")
  .option("--skip-nginx", "Don't include nginx configuration")
  .action( function(app, environment) {
    console.log("Creating", environment.cyan, "rockup file for", app.cyan, "app");
  });

program.parse(process.argv);
