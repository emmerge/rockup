// RockUp
// Deploy -- Move files to source environment, perform deployment
//  commands and execute corresponding scripts.

var nodemiral = require("nodemiral");
var os = require("os");
var path = require("path");
var _ = require("underscore");

var Builder = require("./Builder");
var Config = require("./Config");

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
  console.log( "Building node bundle...".cyan.bold );

  var config = this._config;

  // Build and Zip the application:
  var targetDir = path.resolve(process.cwd(), "tmp"); // os.tmpDir();
  console.log("Will build into target:", targetDir);
  var builder = new Builder(config.appPath(), targetDir);
  // builder.build( function() {
  //   console.log("Build complete!");
  //   callbackFn();
  // });

  builder.buildAndZip( function () {
    // Zipped tarball is now created at builder.archivePath
    console.log("Bundle stage complete!");
    callbackFn();
  });
  return;

  var hosts = config.hosts();
  _.each(hosts, function(host){
    console.log( ("Deploying to host "+host.name+"...").yellow.bold );

    // Create a session
    var sshSession = nodemiral.session(
      host.name, 
      {username: host.username}, 
      {
        ssh: { agent: process.env.SSH_AUTH_SOCK },
        keepAlive: true
      }
    );

    // Create a task list for this session:
    var sshTasks = nodemiral.taskList("Deploy "+config.app.name);

    // Add task to upload application bundle:
    sshTasks.copy("Uploading bundle", {
      src: bundlePath,
      dest: "/opt/"+config.app.name+"/tmp/bundle.tar.gz",       // TODO: Change location to be multi-service universal
      progressBar: true
    });

    // For each service, invoke additional deployment:
    var services = config.services(host.name);
    _.each(services, function(service) {
      console.log( ("Deploying service "+service.name+"...").yellow );

      // Place environment prep script:
      sshTasks.copy("Preparing Environment for "+service.name+" on "+host.name, {
        src: path.resolve(TEMPLATES_DIR, 'env.sh'),             // TODO: Adjust template source dir
        dest: '/opt/' + appName + '/config/env.sh',             // TODO: Modify directory for service-specific and release-specific target
        vars: {
          env: service.env || {},
          appName: appName
        }
      });

      // Execute deployment script:
      sshTasks.executeScript("Moving Application Files and Launching "+service.name+" on "+host.name, {
        script: path.resolve(TEMPLATES_DIR, 'deploy.sh'),       // TODO: Adjust template source dir
        vars: {
          appName: appName                                      // TODO: Add additional vars for host+service+env, etc.
        }
      });

    }); // services

    // Run the server tasks for this host:
    sshTasks.run(sshSession, function (results) {
      console.log("Deployment complete");
      _.each(results, function(output, command) {
        console.log(command.green);
        console.log(output);
      });
    });

  }); // hosts

};


/**
 * Query target hosts to pull back a recent deployment history.
 **/
Deploy.prototype.history = function () {

};
