RockUp
======

Deployment and configuration management tool for Meteor applications.

Provides tools to:

* Deploy Meteor appications on your own servers
* Manage apps as services
* Push configuration to single or multi- instance deployments

_Pre-implementation, proposed CLI features described in this doc._

Objectives:

* Parity with mup
* Support for multiple on-box services of same application on same server
* Support for shared/default configuration with overrides
* Ability to reconfigure supporting services nginx, upstart from tool
* Hook-based implementation to allow for pre- and post- action hooks (e.g., timing, notify slack)

## Installation

Install the build tool globally:

```
$ npm install -g rockup
```

## Project Start

RockUp commands accept an environment name as their first argument. This can
be any name you wish, but typical choices are production, staging, etc.

To get started with RockUp, your first step is toi nitialize local config
files for your environment. Assuming production:

`rock init production`

This will create a /deploy directory relative to your working directory, and
touch `production.rockup.json` and `production.settings.json` files. The
settings file can be used to customize Meteor app settings. The rockup file
is where you'll describe the target deployment environment.

## RockUp File

The basic configuration format for RockUp is the RockUp file. This is a JSON
description of your application, the hosts it will run on, the services it will
run on each host, and configuration for those entities. 

A project will have one RockUp file for each target environment. Its sections
are:

### app

Defines details about the *software* package deployed.

* **name** The name of your application. Used in filenames, references.
* **path** The path, typically relative to the rockup file, to the app source
  locally (e.g., "~/git/myproject", "../app", etc.)
* **binaryNpmModules**: An object describing any binary dependencies your project
  may have, as they will require special rebuilding on any target host.

### defaults

*This section is optional.* Define default values for the sections described later.
This section allows you to specify the default environment variables, host login
settings, etc. that will be used as the basis for all similar configuration later
on in the file.

* **hosts** Object defining default values for all members of `hosts`
* **env** Object defining default environment vars for all services
* **confs** (WIP) default configuration files to include per-host

### hosts

An array of host specifications used to define the servers to which you will be
deploying as part of this environment. For each host, you specify:

* **name** The hostname for the server. Will be the SSH target.
* **username** The username used for login

By default, RockUp will use your running SSH agent to load credentials for a login
to this host. We are working on adding support for specifying password or cert files
here, directly, in the future.

* **services** An array of service definitions, described below

### services

Each host can specify any number of services to run. A service is a single instance
of the application code, which a distinct name and configurably different environment
variables. The keys for each service are:

* **name** Name of the service. Uses in init scripts. No spaces.
* **env** Object definining the environment variables that will be applied for this
  service instance only.

Here's a sample `hosts` declaration that specifies two hosts each with two services:

```
"hosts": [
  {
    "name": "app1.mydomain.com",
    "username": "mylogin",
    "services": [
      { "name": "myapp1", "env": { "PORT": 8081 } },
      { "name": "myapp2", "env": { "PORT": 8082 } }
    ]
  },
  {
    "name": "app2.mydomain.com",
    "username": "mylogin",
    "services": [
      { "name": "myapp1", "env": { "PORT": 8081 } },
      { "name": "myapp2", "env": { "PORT": 8082 } }
    ]
  }
]
```

### deploy

*This section is optional.* Specify deploy-specific configurations.

* **pingService** Boolean. When set, RockUp will ping the specified PORT
  to ensure your application is up and bound. Default is false, which falls
  back to using the `service status` mechanism on machine to verify deploy.
* **pingWait** Number of seconds to wait after restart before attempting to
  ping the service port.


## Prepare Hosts

Once your environment is well-described in a rockup.json file, you will want
to prepare your host servers to receive deployments:

`rock prepare production`

This command logs onto your host servers and prepares app service directories
that will receive code pushes, store configuration, and serve bundled versions
of your app. 

Prepare performs these actions:

* Creates directory under "/opt" (e.g., "/opt/myapp"), which will contain
  source code, release histories, and configurations
* Registers an upstart service for each service specified in rockup configuration


## Deployment

Now that your local configuration is set and your hosts are ready to receive
deployments, you can deploy at will from the command-line. Assuming an environment
named production, the invocation is as follows:

`rock deploy production`

The steps of a deployment are:

1. Locally build application from source and save as a bundle
2. Copy that bundle onto each host, create release, update source links
3. Copy configuration for each service into place on host
4. Restart each service specified

(WIP) you can also target a specific deployment to a specific host: `rock deploy production --host app1`


## Recovery

Get a history of successful deployments: `rock history production`

Rollback the last deployment: `rock rollback production`


## Service Management

Reconfigure and restart: `rock config production`  (-h, -s allowed)

Take upstart actions against services (still supporting -h, -s, too):

```
$> rock status production       # Query upstart status of all production services
$> rock start production        # Start all production app services
$> rock stop production         # Stop all production app services
$> rock restart production      # Restart all production app services
```

Tail logs: `rock logs production` (-h, -s probably best)



2016 Emmerge, Inc.
