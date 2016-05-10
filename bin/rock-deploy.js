#!/usr/bin/env node

var inspect = require("util").inspect;
var _ = require("underscore");
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
      //console.log("Configuration:", inspect(config, {colors: true, depth: null}));
      console.log("Configuration Obj: ", inspect(config._config, {colors:true, depth: null}));

      console.log("Configuration defines hosts:", config.hostNames());

      _.each( config.hosts(), function(host) {
        console.log(("Host "+host.name).yellow, ":", inspect(host));
        console.log("Services".blue, ":", config.serviceNames(host.name));
        
        _.each( config.services(host.name), function(service) {
          console.log(("Service "+service.name).cyan, ":", inspect(service));
        });
      });

      console.log("thred3 on app2:", inspect( config.service('app2.emmerge.com', 'thred-3') ) );

    // } catch (err) {
    //   console.error("Fatal error: ".red + inspect(err, {colors: true}));
    //   process.exit(1);
    // }

  });

program.parse(process.argv);
