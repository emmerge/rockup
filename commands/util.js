// RockUp
// Util - Usage methods and functionality for CLI

var inspect = require('util').inspect;

Util = {
  /**
   * Return a list of Hosts that will be used in this invocation. Can
   * be altered by user specifying a host limitation or using host-
   * specifying options on the command line.
   *
   * @params {Config} config      The environment configuration in use
   * @params {Object} cliOptions  The commander options 
   * @returns {Array Host} List of target hosts
   **/
  _getHosts: function (config, cliOptions) {
    return cliOptions.host ? [config.hosts.get(cliOptions.host)] : config.hosts.list;
  }
};

module.exports = Util;
