// RockUp
// Commands-List -- List target environments available

var _ = require('underscore');
var path = require('path');
var Config = require('../lib/Config');

module.exports = addCommand;

function addCommand (program) {
  program
    .command("list")
    .description("List target environments available")
    .action( function () {
      var environments = Config.list( path.resolve(process.cwd(), 'deploy') );
      console.log("Environments:".yellow, environments.join(", "), "\n");
    });

  return program;
}
