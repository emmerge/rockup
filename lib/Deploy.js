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
  this._options = _.defaults({}, options, {hosts: config.hostNames()});
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

  var envName = config.envName();
  var appName = config.appName();
  var releaseName = "r"+Deploy._nowStamp();
  var releaseDir = "/opt/"+appName+"/releases/"+releaseName;
  var bundlePath = this._options.bundle;

  if ( bundlePath ) {
    afterBundleFn( bundlePath );
  }
  else {
    // Build and Zip the application:
    var targetDir = path.resolve(process.cwd(), "tmp"); // os.tmpDir();
    var builder = new Builder(config.appPath(), targetDir);
    builder.buildAndZip( afterBundleFn );
    // TODO: Optionally rm target tmpdir after successful bundling
  }

  /**
   * Callback for after bundle is created.
   * @param {String} bundlePath     Path to the resultant zipped tarball
   **/
  function afterBundleFn ( bundlePath ) {
    console.log("Bundle stage complete!".green, "Archive:", bundlePath);

    var templateDir = path.resolve(__dirname, '..', 'templates');
    var tasks = nodemiral.taskList("Deploy "+appName+" to "+envName+" environment");

    // For each host, build and execute deploy script:
    _.each( config.hostNames(), function(hostName) {

      // Build a release directory on the server and place bundle:
      tasks.execute("Creating release directory", {
        command: "mkdir -p "+releaseDir
      });
      tasks.copy("Uploading bundle", {
        src: bundlePath,
        dest: path.resolve(releaseDir, "bundle.tar.gz"),
        progressBar: true
      });

      // For each service, invoke additional deployment:
      var services = config.services(hostName);
      _.each(services, function(service) {

        // Place environment prep script:
        tasks.copy("Uploading "+service.name+" boot script", {
          src: path.resolve(templateDir, 'env.sh'),
          dest: path.resolve(releaseDir, "config", "env."+service.name+".sh"),        // TODO: Vet this filename convention
          vars: {
            env: service.env || {},
            appName: appName,
            envName: envName,
            hostName: hostName,
            serviceName: service.name,
            settingsJson: "settings."+service.name+".json"
          }
        });

        // Place Meteor settings file:
        tasks.copy("Uploading "+service.name+" Meteor settings", {
          src: path.resolve( process.cwd(), 'deploy', 'settings.json'),               // TODO: Path to conf dir must be set
          dest: path.resolve(releaseDir, 'config', "settings."+service.name+".json")
        });

      }); // services

      // Execute deployment script:
      tasks.executeScript("Unpacking, positioning code, and restarting services", {
        script: path.resolve(templateDir, 'deploy.sh'),
        vars: {
          appName: appName,
          envName: envName,
          hostName: hostName,
          releaeName: releaseName,
          serviceNames: config.serviceNames()
        }
      });

      console.log("Tasks for Deploy:\n", inspect(tasks, {colors:true}));

      // Run the server tasks for this host:
      var host = new Host(config, hostName);
      tasks.run( host.sshSession(), function (results) {
        console.log( ("Deployment to "+hostName+" complete!").green );
        deployCallbackFn();
        // TODO: Deployment callback should only be called when ALL hosts have completed
      });

    }); // hosts

  }

  return;

};


/**
 * Query target hosts to pull back a recent deployment history.
 **/
Deploy.prototype.history = function () {

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
