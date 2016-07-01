// RockUp
// Hooks -- Represent a event-based hook that can be run

var spawn = require('child_process').spawn;
var path = require('path');
var _ = require('underscore');

module.exports = Hook;

/**
 * Create an instance of a Hook.
 *
 * @param {String} event        Name of the event to which this hook is connected
 * @param {String} scriptPath   Path to the hook script file
 **/
function Hook (event, scriptPath) {
  this.event = event;
  this.scriptPath = scriptPath;
  this.scriptDir = path.dirname(scriptPath);
}

/**
 * Execute the hook script.
 *
 * @param {Array} args          (opt.) An array of CLI arguments to pass to script invocation
 * @param {Function} cb(err)    Callback function triggered at completion. Passed error upon
 *                              invocation failure or non-zero script exit.
 **/
Hook.prototype.run = function (args, cb) {
  var event = this.event;
  if ( _.isUndefined(cb) && _.isFunction(args) ) {
    cb = args;
    args = [];
  }
  if ( !_.isArray(args) )
    throw new Error(event+" hook must be invoked with Array of arguments");
  
  console.log( ("--- Hook "+event+" Begin ---").yellow.bold );
  var script = spawn(this.scriptPath, args, { cwd: this.scriptDir, stdio: [process.stdin, process.stdout, process.stderr] });
  script.on('exit', function(code, signal) {
    console.log( ("--- Hook "+event+" End ---").yellow.bold );
    if (code === 0)
      cb();
    else
      cb( new Error(event+" hook returned non-zero ("+code+") status") );
  });
  script.on('error', function(err) {
    console.log( ("--- Hook "+event+" End ---").yellow.bold );
    cb(err);
  });
};

// TODO: Allow args to be passed to each hook script
// environment name
// ??