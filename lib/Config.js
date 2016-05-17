// RockUp
// Config -- Load, read, and manipulate deploy configuration files

var fs = require("fs");
var path = require("path");
var _ = require("underscore");

module.exports = Config;

/**
 * Create an instance of a configuration object for the given environment.
 * Constructing a Config object will search for properly path'ed and named
 * RockUp configuration file and attempt to load that file's configuration
 * into memory.
 *
 * @param {String} environment    Name of the target environment
 **/
function Config (environment) {
  this._environment = environment;
  this._filePath = this._getFilePath();
  this._rawConfig = this._loadFromFile();
  this._config = Config.mergeConfig(this._rawConfig);
}

/**
 * Create local base configuration files for the given application and
 * environment. Places a RockUp configuration 
 *
 * @param {String} environment    Name of the target environment
 * @param {String[]} files        Array of file types to generate. Default
 *                                options include 'rockup', 'meteor'
 **/
Config.initialize = function (environment, files) {
  files = _.isUndefined(files) ? ['rockup', 'meteor'] : files;
  var templateDir = path.resolve(__dirname, '..', 'templates');
  var targetDir = path.resolve(process.cwd(), 'deploy');
  var extMap = {
    rockup:   'rockup.json',
    meteor:   'settings.json',
    nginx:    'nginx.conf',
    upstart:  'upstart.conf'
  };

  // Create deploy directory:
  if ( fs.existsSync(targetDir) ) {
    console.log("Config directory already exists:".yellow, "Skipping.".red);
  } else {
    console.log("Creating config directory:".yellow, targetDir.cyan);
    fs.mkdirSync( targetDir );
  }

  // Copy desired template files into target directory:
  _.each(extMap, function( ext, type ) {
    if ( _.indexOf(files, type) > -1 ) {
      var basename = environment+"."+ext;                     // e.g., "staging.rockup.json"
      var source = path.resolve(templateDir, ext);
      var target = path.resolve(targetDir, basename);
      if ( fs.existsSync(target) ) {
        console.log("Config for", type, "already exists.".yellow, "Skipping.".red);
      } else {
        console.log("Creating config for", type, "from template".yellow, basename.cyan);
        copyFile(source, target);
      }
    } else {
      console.log("Skipping", type, "configuration. Not requested.");
    }
  });

  console.log("Rockup project local config initialized".bold.green);

  function copyFile(src, dest) {
    var content = fs.readFileSync(src, 'utf8');
    fs.writeFileSync(dest, content);
  }

};

/**
 * Return path the RockUp configuration files directoy. This is expected to be
 * /deploy underneath the script invocation/working directory.
 **/
Config.prototype._getFileDir = function () {
  return path.resolve( process.cwd(), "deploy" );
};

/**
 * Return path to the RockUp configuration JSON file. The expected file naming
 * convention is "{environment}.rockup.json", so "production.rockup.json" for an
 * environment named production, "dev.rockup.json" for an environment named dev.
 **/
Config.prototype._getFilePath = function () {
  var basename = this._environment+".rockup.json";
  return path.resolve( this._getFileDir(), basename );
};

/**
 * Loads the RockUp configuration for this environment from the expected source
 * location. Will throw exception if file cannot be found or if JSON parsing fails.
 **/
Config.prototype._loadFromFile = function () {
  var filePath = this._getFilePath();
  if ( fs.existsSync(filePath) ) {
    // Loan the JSON configuration:
    try {
      return require(filePath);
    } catch (jsonErr) {
      throw new Error("Error loading JSON config: "+jsonErr);
    }
  } else {
    throw new Error("RockUp configuration file not found. Run `rock init`.");
  }
};

/**
 * Builds the true configuration by merging defaults into the host- and
 * service-specific definitions.
 **/
Config.mergeConfig = function ( rawConfig ) {
  var config = _.extend({}, rawConfig);
  _.each(config.hosts, function(host, idx) {
    host = _.defaults(host, rawConfig.defaults.hosts);
    host.confs = _.defaults({}, host.confs, rawConfig.defaults.confs);
    _.each(host.services, function(service, idx) {
      service.env = _.defaults({}, service.env, rawConfig.defaults.env);
    });
  });
  delete config.defaults;
  return config;
};

/**
 * Return the name of this environment
 **/
Config.prototype.envName = function () {
  return this._environment;
};

/**
 * Return the app definition described in configuration
 **/
Config.prototype.app = function () {
  return this._config.app;
};

Config.prototype.appName = function () {
  return this.app().name;
};

/**
 * Return a list of hosts with fully populated configuration
 */
Config.prototype.hosts = function () {
  return this._config.hosts;
};

/**
 * Return a list of configured host names.
 **/
Config.prototype.hostNames = function () {
  return _.pluck(this.hosts(), 'name');
};

/**
 * Return a specific host definition by hostname
 **/
Config.prototype.host = function( hostName ) {
  return _.findWhere(this.hosts(), {name: hostName});
};

/**
 * Return a list of services for a specified host with a fully populated configuration
 **/
Config.prototype.services = function ( hostName ) {
  var host = this.host(hostName);
  return host.services;
};

/**
 * Return a list of the service names for a given host.
 **/
Config.prototype.serviceNames = function ( hostName ) {
  return _.pluck(this.services(hostName), 'name');
};

/**
 * Return the specific configuration for the named service on the named host
 **/
Config.prototype.service = function ( hostName, serviceName ) {
  return _.where(this.services(hostName), {name: serviceName});
};
