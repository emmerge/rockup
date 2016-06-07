// RockUp
// Deploy -- Move files to source environment, perform deployment
//  commands and execute corresponding scripts.

var nodemiral = require("nodemiral");
var os = require("os");
var path = require("path");
var inspect = require("util").inspect;
var _ = require("underscore");

var Builder = require("./Builder");
var Config = require("./Config");
var Host = require("./Host");
var reduceAsync = require("./Async").reduce;

module.exports = Deploy;

/**
 * Create a deployment object. Pass a RockUp configuration and options
 * and initialize an object with methods for deployment to the appropriate
 * target(s) based on the arguments.
 *
 * @param {Config} config           The RockUp configuration targeted
 * @param {Object} options          An options hash for extra details
 * @param {Array}  options.hosts    An array of hostnames subset to target
 * @param {String} options.bundle   Path to a bundle archive to use for deploy
 **/
function Deploy (config, options) {
  this._config = config;
  this._options = _.defaults({}, options, {hosts: config.hosts.names});
}

/**
 * Perform the deployment described in this._config and this._options by
 * building app bundle, logging onto target hosts, copying source files,
 * and restarting services.
 *
 * @params {Function} deployCallbackFn  Callback to be called after deploy
 *
 * @returns {Object} Object containing success/failure map for hosts, 
 *  services; Release identifier
 **/
Deploy.prototype.push = function ( deployCallbackFn ) {
  var config = this._config;
  var bundlePath = this._options.bundle;

  var releaseName = "r"+Deploy._nowStamp();
  console.log("Release:", releaseName);

  if ( bundlePath ) {
    console.log("Bundle provided:", bundlePath);
    afterBundleFn( bundlePath );
  }
  else {
    // Build and Zip the application:
    console.log("Bundle will be built from source.");
    var targetDir = path.resolve(process.cwd(), "tmp"); // os.tmpDir();
    var builder = new Builder(config.app.path, targetDir);
    builder.buildAndZip( afterBundleFn );
    // TODO: Optionally rm target tmpdir after successful bundling
  }

  /**
   * Callback for after bundle is created.
   * @param {String} bundlePath     Path to the resultant zipped tarball
   **/
  function afterBundleFn ( bundlePath ) {
    console.log("Bundle stage complete!".green, "Archive:", bundlePath);

    // For each host, build and execute deploy script:
    var ops = config.hosts.map( function(host) {
      return function(memo, cb) {
        host.deploy(releaseName, bundlePath, function(err, results) {
          if (err) {
            cb(err);
          } else {
            memo[host.name] = results;
            cb();
          }
        });
      }; // wrap
    }); 

    function _allHostsComplete( hostMap ) {
      var results = { map: hostMap, successful:[], failed:[] };
      _.each(hostMap, function(info, hostName) {
        if (info.error)
          results.failed.push(hostName);
        else
          results.successful.push(hostName);
      });
      deployCallbackFn(null, results);
    }

    ops.unshift({}); // memo
    ops.push(_allHostsComplete);
    reduceAsync.apply(this, ops);
  }

};


/**
 * Return a human-readable timestamp that can be used for date-versioning
 * deployments.
 *
 * @returns {String}    A string capture of current time in "YYYYMMDD_HHMMSS" format
 **/
Deploy._nowStamp = function() {
  return new Date().toISOString().replace(/\-|\:|(\.\d+Z$)/g, '').replace('T','_');
};
