// RockUp
// Commands-Info -- Display details and check for errors in a RockUp file

var clc = require('cli-color');
var Line = CLUI.Line;
var fs = require('fs');

var Config = require('../lib/Config');

module.exports = InfoCommand;

_TableHeaderWidth = 24;
_TableCellWidth = 60;
_TableHeaderStyles = [clc.cyan];
_TableCellStyles = [clc.white];

function InfoCommand (program) {
  program
    .command("info")
    .arguments("<environment>")
    .option("-d --detail", "View resulting compiled config file")
    .description("Check configuration file for issues")
    .on('--help', function() {
      console.log("  blah\n");
    })
    .action( function(env, cliOptions) {

      console.log("Environment File Paths".yellow);
      _output("Environment:", env);
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
            _output("  -> exists?:", fs.existsSync(config.app.path) ? "YES".green : "NO".red);
        } else if (_.isObject(val)) {
          _output(" ."+key+":", "defined".yellow);
        }
      });

      console.log("\nHooks".yellow);
      _(config.hooks).each( function(hook, event) {
        _output(event+":", hook.scriptPath);
      });
      
      console.log("\nHosts and Services".yellow);
      _output("hosts:", "("+config.hosts.count+" defined)");
      config.hosts.each( function(host) {
        _output(" "+host.name.bold+":", "("+host.services.count+" services)");
        host.services.each( function(service) {
          _output("  "+service.name+"", "");
          if (service.env) _output("   .env:", _.keys(service.env).join(', '));
          if (service.settingsPath) {
            _output("   .settingsPath:", service.settingsPath);
            _output("   -> exists?:", fs.existsSync(service.settingsPath) ? "YES".green : "NO".red);
          } else {
            _output("   .settingsPath:", "not defined".yellow);
          }
        });
      });
      console.log("");

      function _output(header, content, clc) {
        new Line().padding(2)
          .column(header, _TableHeaderWidth, _TableHeaderStyles)
          .column(content, _TableCellWidth, _TableCellStyles)
          .fill()
          .output();
      }

      if (cliOptions.detail) {
        console.log("Full Configuration:".yellow, "\n", inspect(config.toJSON(), {colors:true, depth:null}));
        console.log("");
      } 

    });

  return program;
}
