// RockUp
// Config -- Load, read, and manipulate deploy configuration files

var fs = require("fs");
var path = require("path");
var inspect = require("util").inspect;
var _ = require("underscore");

var Host = require("./Host");
var Service = require("./Service");

module.exports = Config;

/**
 * Create an instance of a configuration object for a given environment.
 * Pass a string containing the filepath to a rockup file to load
 * configuration from that file. Pass an Object to use as the configuration
 * otherwise. If the passed configuration does not specify an environment
 * name, one can be provided as the second argument.
 *
 * @param {Str|Obj} pathOrCfg   Path to RockUp file or JS Object containing
 *                              full configuration.
 * @param {String} envName      (opt.) The name of the environment, if not
 *                              defined within the rockup file.
 **/
function Config (pathOrCfg, envName) {
  if ( _.isObject(pathOrCfg) )
    this.src = Config._compile( pathOrCfg );
  else if ( _.isString(pathOrCfg) )
    this.src = Config._compile( Config._loadJSON( pathOrCfg ) );

  this.app = this._extractApp();
  this.environment = this.src.environment || envName;
  this.hosts = this._extractHosts();
  delete this.src;    // used for extraction, then unneeded
}

/**
 * Return an array of target environment names currently defined in
 * rockup files local to the working dir.
 *
 * @returns {Array}   List of environment names
 **/
Config.list = function () {
  var rockupDir = this._getFileDir();
  var allFiles = fs.readdirSync(rockupDir);
  var envNames = allFiles.reduce(function(memo, fileName) {
    if ( fileName.match(/\.rockup\.json$/) ) {
      memo.push( fileName.replace(/\.rockup\.json$/, '') );
    }
    return memo;
  }, []);
  return envNames;
};

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
  var targetDir = this._getFileDir();
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
 * Load RockUp configuration from the given JSON filePath.
 *
 * @param {String} filePath   Path to the rockup.json file
 * @returns {Object}          JSON contents of file
 * @throws                    Error for nonexist filePath
 * @throws                    Error for JSON load/syntax failure
 **/
Config._loadJSON = function ( filePath ) {
  if ( fs.existsSync(filePath) ) {
    // Load the JSON configuration:
    try {
      return require(filePath);
    } catch (jsonErr) {
      throw new Error("Error loading JSON config"+filePath+": "+jsonErr);
    }
  } else {
    throw new Error("RockUp configuration file "+filePath+" not found. Run `rock init`.");
  }
};

/**
 * Builds the true configuration by merging defaults into the host- and
 * service-specific definitions.
 *
 * Boils down the given raw rockup configuration, merging defaults from separate
 * section into host- and service-specific definitions.
 *
 * @param {Object} rawConfig    The raw JSON source
 * @returns {Object}            Compiled JSON source
 **/
Config._compile = function ( rawConfig ) {
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
 * Extract app details from source configuration.
 **/
Config.prototype._extractApp = function () {
  var a = _.extend({}, this.src.app);
  a.path = path.resolve( process.cwd(), a.path );
  return a;
};

/**
 * Extract host information from the source configuration.
 **/
Config.prototype._extractHosts = function () {
  return {
    // TODO: group host methods
    list: _.map( this.src.hosts, function(info) { 
      info.environment = this.environment;
      info.app = this.app;
      return new Host(info); 
    }, this ),
    names: _.pluck( this.src.hosts, 'name' ),
    get: function(name) { return _.findWhere(this.list, {name: name}); }
  };
};


/**
 * Return a list of services for a specified host with a fully populated configuration
 **/
Config.prototype.services = function ( hostName ) {
  var host = this.hosts.get(hostName);
  return (host && host.services) ? host.services : [];
};

/**
 * Return the specific configuration for the named service on the named host
 **/
Config.prototype.service = function ( hostName, serviceName ) {
  return this.services(hostName).get(serviceName);
};
