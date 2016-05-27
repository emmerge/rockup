// RockUp
// Util - Usage methods and functionality for CLI

Util = {};

module.exports = Util;

/**
 * Given an initial memo, set of operations, and final callback, ensure
 * that the final callback is only called when all operations have completed.
 * Operations are passed the memo object and a callback that can be used
 * to denote operation completion. The final callback will be called with
 * the final state memo object as its parameter.
 *
 * @param memo  A memo object passed to all functions, will be passed to callback
 * @param {Function} operations[]   Any number of operation functions
 * @param {Function} callback       Function to call at all completion.
 **/
Util.reduceAsync = function (memo) {
  var nOperations = arguments.length - 2;
  if (nOperations <= 0)
    return;
  var nComplete = 0;
  var nError = 0;
  var _allComplete = arguments[arguments.length-1];
  function _operationComplete (err) {
    ++nComplete;
    if (err) ++nError;
    if (nComplete >= nOperations)
      _allComplete(memo);
  }
  for (var i = 1; i < arguments.length-1; i++) {
    arguments[i](memo, _operationComplete);
  }  
};

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
