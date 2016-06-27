// RockUp
// Builder -- Build and bundle meteor applications and package for deployment

var _ = require('underscore');
var inspect = require('util').inspect;
var spawn = require("child_process").spawn;
var path = require("path");
var fs = require("fs");
var archiver = require("archiver");

module.exports = Builder;

/**
 * Instantiate a Builder object, which takes path to source directory
 * and path to desired destination build directory as arguments. The
 * builder will determine an output path for a bundle archive.
 *
 * @param {String} appDir     Path to the meteor source
 * @param {String} buildDir   Path to desired build output
 * @param {String} buildArch  The target server architecture (argument passed
 *                            to meteor build, default matches local)
 **/
function Builder (appDir, buildDir, buildArch) {
  this.appDir = appDir;           // Path to meteor app
  this.buildDir = buildDir;       // Local build target
  this.buildArch = buildArch;     // Destination architecture (if undefined, built for local arch)
  this.archiveSource = path.resolve(buildDir, "bundle");
  this.archivePath = path.resolve(this.buildDir, "bundle.tar.gz");
  this.built = false;
  this.zipped = false;
}

/**
 * Return true if the application exists. False otherwise.
 *
 * @returns {Boolean} Existence of the app source directory
 **/
Builder.prototype.appExists = function () {
  return fs.existsSync(this.appDir);
};

/**
 * String together calls to first build a node bundle from meteor source,
 * then archive the resulting build directory into a zipped tarball.
 * Equivalent to making the calls separately, with the callback given
 * triggered at completion/error of the zip step.
 *
 * @param {Function} callbackFn   Callback triggered upon archive completion
 *                                returns the path to the zipped tarball.
 *
 * @throws Errors occurring during build
 * @throws Errors occurring during archive/zip
 **/
Builder.prototype.buildAndZip = function (callbackFn) {
  var self = this;
  self.build( function(err) {
    if (err)
      return callbackFn(new Error("Error building app: "+err));
    self.zip( function(err) {
      if (err)
        return callbackFn(new Error("Error archiving bundle: "+err));
      callbackFn( null, self.archivePath );
    });
  });
};

/**
 * Invoke `meteor build` to build a node application from meteor source. This
 * method will use the Builder object's configuration and output the bundle
 * directory to this.buildDir.
 *
 * @param {Function} callbackFn     Callback triggered upon error or completion
 *                                  returns error and buildDir
 *
 * NOTE: While the wrapper buildAndZip throws errors occurring during build,
 * this method returns errors as the first parameter to the callback.
 **/
Builder.prototype.build = function (callbackFn) {
  if (! this.appExists() ) {
    console.error("Cannot proceed with build:".red, "App dir", this.appDir, "does not exist.");
    callbackFn( new Error("App does not exist") );
    return;
  }
  console.log("Building application bundle...");
  var self = this;
  var args = ["build", "--directory", this.buildDir, "--server", "http://localhost:3000", "--server-only"];
  if (this.buildArch) {
    console.log("Building for specified target architecture "+this.buildArch);
    args.push("--architecture");
    args.push(this.buildArch);
  }
  var meteor = spawn("meteor", args, {cwd: this.appDir, stdio: [process.stdin, process.stdout, process.stderr] });
  meteor.on('exit', function(code, signal) {
    if (code === 0) {
      self.built = true;
      callbackFn(null, this.buildDir);
    } else {
      callbackFn( new Error("Meteor build failed: Exit code:"+code+", Signal:"+signal) );
    }
  });
  meteor.on('error', function(err) {
    callbackFn(err);
  });
};

/**
 * Compress a build directory into a GZipped tarball bundle. Outputs the tarball
 * to this.archivePath.
 *
 * @param {Function} callbackFn     Callback triggered upon error or completion
 *                                  returns error and archivePath
 *
 * NOTE: While the wrapper buildAndZip throws errors occurring during archive,
 * this method returns errors as the first parameter to the callback.
 **/
Builder.prototype.zip = function (callbackFn) {
  console.log("Archiving application bundle...");
  var self = this;
  var srcDir = this.archiveSource;
  var tgtPath = this.archivePath;

  var output = fs.createWriteStream(tgtPath);
  var archive = archiver("tar", {
    gzip: true,
    gzipOptions: { level: 9 }
  });
  archive.pipe(output);
  output.once("close", function() {
    self.zipped = true;
    callbackFn(null, tgtPath); 
  });
  archive.once("error", function(err) {
    callbackFn(err);
  });

  archive.directory(srcDir, "bundle").finalize();
};


/**
 * Remove the build directory from the local file system. Useful for cleaning
 * up after a build has completed and the resulting bundle has been captured.
 **/
Builder.prototype.removeBuildDir = function () {
  fs.rmdirSync( this.buildDir );
};
