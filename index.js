// RockUp
// Meteor Service Deployment

_ = require('underscore');
inspect = require('util').inspect;

RockUp = {
  Config: require('./lib/Config'),
  Host: require('./lib/Host'),
  Service: require('./lib/Service'),
  Builder: require('./lib/Builder'),
  Deploy: require('./lib/Deploy'),
  Asyc: require('./lib/Async')
};

RockUp._loadConfigFromHere = function (environment) {
  return new RockUp.Config( require("path").resolve( process.cwd(), 'deploy', environment+'.rockup.json' ) );
};

module.exports = RockUp;
