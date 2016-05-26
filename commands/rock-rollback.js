// RockUp
// Commands-Rollback -- Change active server code to reference a previously deployed version

var RockUtil = require('./util');
var Config = require('../lib/Config');
var Deploy = require('../lib/Deploy');

module.exports = RollbackCommand;

function RollbackCommand (program) {

  program
    .command("rollback <environment>")
    .alias("undo")
    .description("Rollback to a previous deployment")
    .option("-r, --release <name>", "Name of release to roll back to (defaults to previous)")
    .action( function(env, options) {
      var targetRelease = options.release;
      if (! targetRelease) {
        targetRelease = "previous";     // TODO: Retrieve most recent release from history
      }
      console.log( "Will rollback to".red, targetRelease.red.bold.underline, "release.".red );
      var config = new Config._loadLocalConfigFile(env);
      Deploy.rollback(config);
    });

  return program;
}
