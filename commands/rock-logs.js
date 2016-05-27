// RockUp
// Commands-Logs -- Tail service logs

module.exports = LogsCommand;

function LogsCommand (program) {
  program
    .command("logs <environment>")
    .description("Tail service logs");

  return program;
}
