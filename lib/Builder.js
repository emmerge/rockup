// RockUp
// Builder -- Build and bundle meteor applications and package for deployment

var _ = require("underscore");
var spawn = require("child_process").spawn;
var path = require("path");
var fs = require("fs");
var inspect = require("util").inspect;
var archiver = require("archiver");

module.exports = Builder;

function Builder (appDir, buildDir) {
  this.appDir = appDir;
  this.buildDir = buildDir;
  this.archivePath = path.resolve(this.buildDir, "bundle.tar.gz");
}

Builder.prototype.buildAndZip = function (callbackFn) {
  var self = this;
  self.build( function() {
    self.zip( callbackFn );
  });
};

Builder.prototype.build = function (callbackFn) {
  console.log("Building application bundle...");
  var args = ["build", "--directory", this.buildDir, "--server", "http://localhost:3000"];
  var meteor = spawn("meteor", args, {cwd: this.appDir, stdio: [process.stdin, process.stdout, process.stderr] });
  meteor.on('close', callbackFn);
};

Builder.prototype.zip = function (callbackFn) {
  console.log("Archiving application bundle...");
  var srcDir = this.buildDir;
  var tgtPath = this.archivePath;

  var output = fs.createWriteStream(tgtPath);
  var archive = archiver("tar", {
    gzip: true,
    gzipOptions: { level: 9 }
  });
  archive.pipe(output);
  output.once("close", callbackFn);
  archive.once("error", function(err) {
    console.error("Bundle archiving failed:", err);
    callbackFn(err);
  });

  archive.directory(srcDir, "bundle").finalize();
};
