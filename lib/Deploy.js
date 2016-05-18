// RockUp
// Deploy -- Move files to source environment, perform deployment
//  commands and execute corresponding scripts.

var nodemiral = require("nodemiral");
var os = require("os");
var path = require("path");
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
 * @param {Config} config         The RockUp configuration targeted
 * @param {Object} options        An options hash for extra details
 * @param {Array} options.hosts   An array of hostnames subset to target
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
 * @returns {Object} Object containing success/failure map for hosts, 
 *  services; Release identifier
 **/
Deploy.prototype.push = function ( callbackFn ) {
  var config = this._config;

  var envName = config.envName();
  var appName = config.appName();
  var releaseName = "r"+Deploy._nowStamp();
  var releaseDir = "/opt/"+appName+"/releases/"+releaseName;

  // Build and Zip the application:
  var targetDir = path.resolve(process.cwd(), "tmp"); // os.tmpDir();
  var builder = new Builder(config.appPath(), targetDir);

  builder.buildAndZip( function () {
    // Zipped tarball is now created at builder.archivePath
    console.log("Bundle stage complete!".green, "Archive:", builder.archivePath);

    var templateDir = path.resolve(__dirname, '..', 'templates');
    var tasks = nodemiral.taskList("Deploy "+appName+" to "+envName+" environment");

    // For each host, build and execute deploy script:
    _.each( config.hostNames(), function(hostName) {

      // Build a release directory on the server and place bundle:
      tasks.execute("Creating release directory", {
        command: "mkdir -p "+releaseDir
      });
      tasks.copy("Uploading bundle", {
        src: builder.archivePath,
        dest: path.resolve(releaseDir, "bundle.tar.gz"),
        progressBar: true
      });

      // For each service, invoke additional deployment:
      var services = config.services(host.name);
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

      // Run the server tasks for this host:
      var host = new Host(config, hostName);
      tasks.run( host.sshSession(), function (results) {
        console.log( ("Deployment to "+hostName+" complete!").green );
      });

    }); // hosts


    // TODO: This callback needs to be moved _inside_ another callback after completion.
    callbackFn();
  });

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
