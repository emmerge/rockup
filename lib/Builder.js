// RockUp
// Builder -- Build and bundle meteor applications and package for deployment

var _ = require("underscore");
var spawn = require("child_process").spawn;
var path = require("path");
var archiver = require("archiver");

module.exports = Builder;

function Builder (appDir, targetDir) {
  this.appDir = appDir;
  this.targetDir = targetDir;
  this.archivePath = path.resolve(this.targetDir, "bundle.tar.gz");
}

Builder.prototype.buildAndZip = function (callbackFn) {
  var self = this;
  self.build( function() {
    self.zip( callbackFn );
  });
};

Builder.prototype.build = function (callbackFn) {
  var args = ["build", "--server-only", "--server", "http://localhost:3000", "--directory", this.targetDir];
  var meteor = span("meteor", args, {cwd: this.appDir});
  meteor.stdout.pipe(process.stdout, {end: false});
  meteor.stderr.pipe(process.stderr, {end: false});
  meteor.on('close', callbackFn);
};

Builder.prototype.zip = function (callbackFn) {
  var srcDir = this.targetDir;
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
