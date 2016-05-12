// RockUp
// Builder -- Build and bundle meteor applications and package for deployment

var _ = require("underscore");
var spawn = require('child_process').spawn;

module.exports = Builder;

function Builder (appDir, targetDir) {
  this.appDir = appDir;
  this.targetDir = targetDir;
}

Builder.prototype.build = function (callbackFn) {
  var args = ["build", "--server-only", "--server", "http://localhost:3000", "--directory", this.targetDir];
  var meteor = span("meteor", args, {cwd: this.appDir});
  meteor.stdout.pipe(process.stdout, {end: false});
  meteor.stderr.pipe(process.stderr, {end: false});
  meteor.on('close', callbackFn);
};

Builder.prototype.zip = function () {

};
