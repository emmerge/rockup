// RockUp
// Config -- Load, read, and manipulate deploy configuration files

var fs = require("fs");
var _ = require("underscore");

module.exports = Config;

function Config (environment) {
  this._environment = environment;
  this._filePath = this._getFilePath();
  this._rawConfig = this._loadFromFile();
  this._config = Config.mergeConfig(this._rawConfig);
}

/**
 * Configuration files can be named and located in one of two fashions:
 *  - Within a /deploy subdirectory, named for the environment (e.g., "production.json")
 *  - Within the working directory, named jointly (e.g., "deploy-production.json")
 * RockUp will check first for the deploy directory and attempt to load the 
 * file from there. Failing that, it will attempt to load the dash-joined file.
 **/
Config.prototype._getFilePath = function () {
  var basename1 = this._environment+".json";
  var fullPath1 = [ process.cwd(), "deploy", basename1 ].join("/");
  if ( fs.existsSync(fullPath1) )
    return fullPath1;
  var basename2 = "deploy-"+this._environment+".json";
  var fullPath2 = [ process.cwd(), basename2 ].join("/");
  if ( fs.existsSync(fullPath2) )
    return fullPath2;

  throw new Error("RockUp configuration file not found. Run `rock prepare` first.");
};

/**
 * Requires the best match configuration file and returns a JSON object containing
 * the configuration details.
 **/
Config.prototype._loadFromFile = function () {
  try {
    return require(this._filePath);
  }
  catch (err) {
    throw new Error("Error loading configuration file "+this._filePath+": "+err);
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
 * Return a list of hosts with fully populated configuration
 */
Config.prototype.hosts = function () {
  return this._config.hosts;
};

Config.prototype.hostNames = function () {
  return _.pluck(this.hosts(), 'name');
};

/**
 * Return a list of services for a specified host with a fully populated configuration
 **/
Config.prototype.services = function ( hostName ) {
  var host = _.findWhere(this.hosts(), {name: hostName});
  return host.services;
};

Config.prototype.serviceNames = function ( hostName ) {
  return _.pluck(this.services(hostName), 'name');
};

/**
 * Return the specific configuration for the named service on the named host
 **/
Config.prototype.service = function ( hostName, serviceName ) {
  return _.where(this.services(hostName), {name: serviceName});
};
