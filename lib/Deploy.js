// RockUp
// Deploy -- Move files to source environment, perform deployment
//  commands and execute corresponding scripts.

var nodemiral = require("nodemiral");

module.exports = Deploy;

function Deploy (port) {
  this.name = "deployment.sys";
  this.port = port || 80;
}



    // var server = {
    //   host:       "proc1.emmerge.com",
    //   username:   "ubuntu"
    // };

    // var session = nodemiral.session(
    //   server.host, 
    //   {username: server.username}, 
    //   {
    //     ssh: { agent: process.env.SSH_AUTH_SOCK },
    //     keepAlive: false
    //   }
    // );

    // session.execute('uname -a', function(err, code, logs) {
    //   console.log(logs.stdout);
    //   if (err) {
    //     console.log("Error uname: "+inspect(err).red);
    //     return;
    //   } else {
    //     session.execute('uptime', function(err, code, logs) {
    //       console.log(logs.stdout);
    //       if (err) {
    //         console.log("Error uptime: "+inspect(err).red);
    //         return;
    //       }
    //     });
    //   }
    // });