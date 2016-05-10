

module.exports = Deploy;

function Deploy (port) {
  this.name = "deployment.sys";
  this.port = port || 80;
}

