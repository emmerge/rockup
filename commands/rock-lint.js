// RockUp
// Commands-Lint -- Display details and check for errors in a RockUp file

var clui = require('clui');
var clc = require('cli-color');
var _ = require('underscore');

var inspect = require('util').inspect;
var fs = require('fs');
var Config = require('../lib/Config');

module.exports = LintCommand;

_TableHeaderWidth = 24;
_TableCellWidth = 60;
_TableHeaderStyles = [clc.cyan];
_TableCellStyles = [clc.white];

function LintCommand (program) {
  program
    .command("lint <environment>")
    .description("Check configuration file for issues")
    .action( function(env, cliOptions) {

      console.log("Environment File Paths".yellow);
      _output("Environment", env);
      var filePath = Config._expectedLocalConfigFilePath(env);
      var fileExists = fs.existsSync(filePath);
      _output("RockUp Path:", Config._expectedLocalConfigFilePath(env));
      _output("RockUp Exists:", fileExists ? "YES".green : "NO".red);
      if (!fileExists) {
        console.log("  Cannot lint non-existant file. Exiting.\n".red.bold);
        process.exit(1);
      }

      var config = Config._loadLocalConfigFile(env);

      console.log("\nApp Configuration".yellow);
      _output("app:", "");
      _.each(config.app, function(val, key) {
        if (_.isString(val)) { 
          _output(" ."+key+":", val); 
          if ( key === 'path' )
            _output(" (exists?):", fs.existsSync(config.app.path) ? "YES".green : "NO".red);
        } else if (_.isObject(val)) {
          _output(" ."+key+":", "defined".yellow);
        }
      });

      console.log("\nHosts and Services".yellow);
      _output("hosts:", "("+config.hosts.count+" defined)");
      config.hosts.each( function(host) {
        _output(" "+host.name+":", "("+host.services.count+" services)");
        host.services.each( function(service) {
          _output("  "+service.name+"", "");
        });
      });

      // console.log("Configuration:\n", inspect(config, {colors:true, depth:null}));
      // console.log("app:", config.app);
      // console.log("appName:", config.app.name);
      // console.log("appPath:", config.app.path);
      // console.log("hosts.list:", config.hosts.list);
      // console.log("hosts.names:", config.hosts.names);
      // console.log("host.get():", config.hosts.get('dev2.emmerge.com'));
      // console.log("host.sshOptions():", config.hosts.get('dev2.emmerge.com').sshConfig());
      // console.log("services:", config.services('dev2.emmerge.com'));
      // console.log("service:", config.service('dev2.emmerge.com', 'bennett-1'));
      // console.log("host.services.tasks.status:", config.hosts.get('dev2.emmerge.com').services.tasks.status());

      console.log("");

      function _output(header, content, clc) {
        new clui.Line().padding(2)
          .column(header, _TableHeaderWidth, _TableHeaderStyles)
          .column(content, _TableCellWidth, _TableCellStyles)
          .fill()
          .output();
      }

    });

  return program;
}
