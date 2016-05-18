// RockUp
// Builder -- Build and bundle meteor applications and package for deployment

var _ = require("underscore");
var spawn = require("child_process").spawn;
var path = require("path");
var inspect = require("util").inspect;
var archiver = require("archiver");

module.exports = Builder;

function Builder (appDir, targetDir) {
  this.appDir = appDir;
  this.targetDir = targetDir;
  this.archivePath = path.resolve(this.targetDir, "bundle.tar.gz");
  console.log("Builder instantiated:", inspect(this, {colors:true}));
}

Builder.prototype.buildAndZip = function (callbackFn) {
  var self = this;
  self.build( function() {
    self.zip( callbackFn );
  });
};

Builder.prototype.build = function (callbackFn) {
  var args = ["build", "--directory", this.targetDir, "--server", "http://localhost:3000"];
  console.log("Launching: meteor", args.join(' '));
  var meteor = spawn("meteor", args, {cwd: this.appDir, stdio: [process.stdin, process.stdout, process.stderr] });
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
