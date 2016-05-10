// RockUp
// Deploy -- Move files to source environment, perform deployment
//  commands and execute corresponding scripts.

var nodemiral = require("nodemiral");
var _ = require("underscore");

var Builder = require("./Builder.js");

Deploy = {
  deploy: function (config) {

    console.log( "Building node bundle...".cyan.bold );

    // build
    var builder = new Builder(config.appPath, os.tmpDir());
    var bundlePath = builder.build();
    var archivePath = builder.zip(bundlePath);

    var hosts = config.hosts();
    _.each(hosts, function(host){
      console.log( ("Deploying to host "+host.name+"...").yellow.bold );

      // copy bundle archive tarball

      var services = config.services(host.name);
      _.each(services, function(service) {
        console.log( (" - Deploying service "+service.name+"...").yellow );

        // move historical deployments
        // move new files in place
        // symlink to active
        // stop/start service

      });
    });

  }
};

module.exports = Deploy;

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