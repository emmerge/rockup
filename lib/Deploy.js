// RockUp
// Deploy -- Move files to source environment, perform deployment
//  commands and execute corresponding scripts.

var Builder = require("./Builder");
var Config = require("./Config");
var Host = require("./Host");

var _ = require('underscore');
var inspect = require('util').inspect;
var nodemiral = require("nodemiral");
var os = require("os");
var fs = require("fs");
var path = require("path");
var async = require("async");

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
 * @param {String} options.mode     Host cadence for deployment ('parallel' or 'series')
 **/
function Deploy (config, options) {
  this._config = config;
  this._options = _.defaults({}, options, {hosts: config.hosts.names, mode: 'parallel'});

  this.hooks = config.hooks;
}

/**
 * Perform the deployment described in this._config and this._options by
 * building app bundle, logging onto target hosts, copying source files,
 * and restarting services.
 *
 * @params {Function} deployCallbackFn  Callback(err, results) where results is
 *                                      a map of success/failure for hosts and services.
 **/
Deploy.prototype.push = function ( deployCallbackFn ) {
  var config = this._config;
  var envName = config.environment;
  var appName = config.app.name;
  var appPath = config.app.path;
  var bundlePath = this._options.bundle;
  var deployMode = this._options.mode;
  var hooks = this.hooks;
  var hostNames = this._options.hosts;
  var hosts = _.map(hostNames, function(name) { return config.hosts.get(name); });

  var releaseName = "r"+Deploy._nowStamp();
  console.log("Release:", releaseName);

  if ( bundlePath ) {
    console.log("Bundle provided:", bundlePath);
    _deployWrapFn(bundlePath, deployCallbackFn);
  }
  else {
    console.log("Bundle will be built from source.");
    _buildWrapFn( function(err, bundlePath) {
      if (err)
        return deployCallbackFn(err);
      else
        _deployWrapFn(bundlePath, deployCallbackFn);
    });
  }


  /**
   * Method to perform build. Builds and zips application.
   * @param {Function} cb(err, path)    Callback to trigger with error or path to bundle
   **/
  function _buildWrapFn ( cb ) {
    if (hooks.preBuild) {
      console.log("Pre Build Hook specified. Running before build.");
      hooks.preBuild.run([envName, appName, appPath], function(err) {
        if (err) { cb(err); } else { build(cb); }
      });
    } else {
      console.log("No Pre Build Hook. Just building.");
      build(cb);
    } // TODO: Support postBuild Hook
    function build (cb) {
      var targetDir = path.resolve( os.tmpdir(), 'rockup' );
      var buildArch = config.app.arch;
      var builder = new Builder(config.app.path, targetDir, buildArch);
      builder.buildAndZip( function(err, bundlePath) {
        if (err) {
          console.log("Bundle stage failed!".red, "Error:", err);
          cb(err);
        } else {
          console.log("Bundle stage complete!".green, "Archive:", bundlePath);
          cb(null, bundlePath);
        }
      });
    }
  }

  /**
   * Method to perform deploy/push. Accepts path to bundle.
   * @param {String} bundlePath     Path to the resultant zipped tarball
   **/
  function _deployWrapFn ( bundlePath, cb ) {
    // TODO: Support preDeployHook
    if (hooks.postDeploy) {
      console.log("Post Deploy Hook specified. Running after deploy.");
      deploy(bundlePath, function(err, results) {
        if (err) {
          cb(err); 
        } else {
          hooks.postDeploy.run([envName, appName, releaseName], function(err) {
            cb(err, results);
          });
        }
      });
    } else {
      console.log("No Post Deploy Hook. Just deploying.");
      deploy(bundlePath, cb);
    }
    function deploy ( bundlePath, cb ) {
      // For each host, build and execute deploy script:
      var calls = {};
      _(hosts).each( function(host) {
        var f = function(cb) {
          host.deploy(releaseName, bundlePath, function(err, results) {
            cb(err, results);
          });
        };
        calls[host.name] = f;
      }); 

      function _allComplete( err, hostMap ) {
        if (err) {
          return deployCallbackFn(err);
        }
        var results = { map: hostMap, successful:[], failed:[] };
        _.each(hostMap, function(info, hostName) {
          if (info.error)
            results.failed.push(hostName);
          else
            results.successful.push(hostName);
        });
        // TODO: builder.removeBuildDir() when present Remove build scratch dir after full success
        cb(null, results);
      }

      if (deployMode === 'series') {
        console.log("Deploying to hosts in series");
        async.series( calls, _allComplete );
      }
      else {
        console.log("Deploying to hosts in parallel");
        async.parallel( calls, _allComplete );
      }
    } // deploy
  }

};

/**
 * Reconfigure the current release in this environment with environment
 * and settings currently specified in local configuration. Logs onto
 * remote hosts, copies env files only, and restarts services.
 *
 * @params {Function} callbackFn    After reconfigure complete, receives error,
 *    success/failure map.
 **/
Deploy.prototype.reconfigure = function ( callbackFn ) {
  var config = this._config;
  var hostNames = this._options.hosts;
  var hosts = _.map(hostNames, function(name) { return config.hosts.get(name); });

  // Reconfiugre each Host:
  var calls = {};
  _(hosts).map( function(host) {
    var f = function(cb) {
      host.reconfigure(function(err, results) {
        if (err)
          cb(err);
        else
          cb(null, results);
      });
    };
    calls[host.name] = f;
  }); 

  function _allComplete( err, hostMap ) {
    if (err)
      return callbackFn(err);
    var results = { map: hostMap, successful:[], failed:[] };
    _.each(hostMap, function(info, hostName) {
      if (info.error)
        results.failed.push(hostName);
      else
        results.successful.push(hostName);
    });
    callbackFn(null, results);
  }

  async.parallel(calls, _allComplete);
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
