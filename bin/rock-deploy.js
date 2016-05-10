#!/usr/bin/env node

var inspect = require("util").inspect;
var program = require("commander");

var Config = require("../lib/Config.js");
var Deploy = require("../lib/Deploy.js");

program
  .arguments("<environment>")
  .option("-f, --force", "Force the deployment to go through")
  .option("-h, --host <name>", "The specific host to target")
  .option("-s, --service <name>", "A specific host service to target")
  .action( function(env) {
    // try {

      var config = new Config(env);

      Deploy.deploy(config);


    // } catch (err) {
    //   console.error("Fatal error: ".red + inspect(err, {colors: true}));
    //   process.exit(1);
    // }

  });

program.parse(process.argv);
