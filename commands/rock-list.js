// RockUp
// Commands-List -- List target environments available

var path = require('path');
var Config = require('../lib/Config');

module.exports = ListCommand;

function ListCommand (program) {
  program
    .command("list")
    .description("List target environments available")
    .action( function () {
      try {
        var environments = Config.list( path.resolve(process.cwd(), 'deploy') );
        console.log("Environments:".yellow, environments.join(", "), "\n");
      } catch (err) {
        console.error("Cannot list environments:".red, err.message);
        console.error("Ensure you've initialized with", "rockup init".yellow, "first\n");
        process.exit(1);
      }
    });

  return program;
}
