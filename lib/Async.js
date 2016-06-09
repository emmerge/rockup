// RockUp
// Async -- Utility methods for asynchronous CLI and session commands

var Async = {
  /**
   * Given a set of operations and a final callback, ensure that final callback
   * is only called when all operations have completed. Each operation is passed
   * an interim callback that should be called at its completion -- sending first
   * argument error (if any).
   *
   * @param {Function} operations[]   Any number of operation functions
   * @param {Function} callback       Function to call at completion
   **/
  exec: function () {
    var nOperations = arguments.length - 1;
    if (nOperations <= 0)
      return;
    var nComplete = 0;
    var nError = 0;
    var _allComplete = arguments[arguments.length-1];
    function _operationComplete (err) {
      ++nComplete;
      if (err) ++nError;
      if (nComplete >= nOperations)
        _allComplete();
    }
    for (var i = 0; i < arguments.length-1; i++) {
      arguments[i](_operationComplete);
    }
  },

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
  reduce: function (memo) {
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
  }
};

module.exports = Async;
