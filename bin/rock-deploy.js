#!/usr/bin/env node

var inspect = require("util").inspect;
var fs = require('fs');
var program = require("commander");

var nodemiral = require("nodemiral");

var Config = require("../lib/Config.js");
var Deploy = require("../lib/Deploy.js");

console.log("Deploy:", inspect(Deploy, {colors: true}));

program
  .arguments("<environment>")
  .option("-f, --force", "Force the deployment to go through")
  .option("-h, --host <name>", "The specific host to target")
  .option("-s, --service <name>", "A specific host service to target")
  .action( function(env) {

    try {

      console.log("Deploying to environment:", env);

      var config = new Config(env);
      console.log("Configuration:", inspect(config, {colors: true}));
      console.log("Configuration Obj: ", inspect(config.getConfig(), {colors:true}));

    } catch (err) {
      console.log("Fatal error".red);
      return;
    }

    return;

    var deploy = new Deploy();
    console.log("Deployer: ", inspect(deploy, {colors: true}));


    // Load configuration

    // Build Meteor Bundle

    // Copy Bundle to Host(s)
    // Per-Service

    // Run Commands

    var server = {
      host:       "proc1.emmerge.com",
      username:   "ubuntu"
    };

    var session = nodemiral.session(
      server.host, 
      {username: server.username}, 
      {
        ssh: { agent: process.env.SSH_AUTH_SOCK },
        keepAlive: false
      }
    );

    session.execute('uname -a', function(err, code, logs) {
      console.log(logs.stdout);
      if (err) {
        console.log("Error uname: "+inspect(err).red);
        return;
      } else {
        session.execute('uptime', function(err, code, logs) {
          console.log(logs.stdout);
          if (err) {
            console.log("Error uptime: "+inspect(err).red);
            return;
          }
        });
      }
    });

  });

program.parse(process.argv);
