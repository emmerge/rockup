// RockUp
// Util - Usage methods and functionality for CLI

Util = {};

module.exports = Util;

/**
 * Generate a callback function to be used in the CLI context as a
 * callback passed to delayed result commands. The returned function
 * accepts error as the first argument and exits the process with
 * a error code of non-zero for error, zero for success.
 *
 * @param {String} commandName      Name to use in status messages
 * @returns {Function}              Callback 
 **/
Util._endCommandCallback = function (commandName) {
  return function(err) {
    if (err) {
      console.log( (commandName+" failed:").red.bold, inspect(err).red );
      process.exit(1);
    }
    else {
      console.log( (commandName+" succeeded!").green.bold );
      process.exit(0);
    }
  };
};
