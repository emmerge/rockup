// RockUp
// Builder -- Build and bundle meteor applications and package for deployment

var _ = require("underscore");

module.exports = Builder;

function Builder (sourcePath, buildPath) {

}

Builder.prototype.build = function () {

  // cd {sourcePath}
  // exec "meteor build --directory {buildPath}"

};

Builder.prototype.zip = function () {

};
