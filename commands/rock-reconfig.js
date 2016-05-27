// RockUp
// Commands-Reconfig -- Push configuration only and restart services

var RockUtil = require('./util');
var Config = require('../lib/Config');

module.exports = ReconfigCommand;

function ReconfigCommand (program) {

  program
    .command("reconfig <environment>")
    .description("Push configuration only and restart");

  return program;
}
