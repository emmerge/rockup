
module.exports = Config;

function Config (environment) {
  this.environment = environment;
  this.filePath = [process.cwd(), "deploy", this.environment+".json" ].join("/");

  try {
    this.config = require(this.filePath);
  } catch (err) {
    console.error("Error loading configuration file", this.filePath, ":", err);
    throw err;
  }
}

Config.prototype.getConfig = function () {
  return this.config;
};
