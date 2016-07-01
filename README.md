RockUp
======

Deployment and configuration management tool for Meteor applications.

Provides tools to:

* Deploy Meteor appications on your own servers
* Manage apps as services
* Push configuration to single- or multi-instance deployments

_RockUp is still pre-release software._

Objectives:

* Parity with mup for deployments
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

### environment

Define the name of the environment. This should match the filename and is already
injected for you when invoking `rock init`. For example, your production environment
should be described in a rockup file "production.rockup.json" and the `environment`
configuration variable should be "production".

### app

Defines details about the *software* package deployed.

* **name** The name of your application. Used in filenames, references.
* **path** The local path, relative to the rockup file, to the app source
  (e.g., "~/git/myproject", "../app", etc.). Full paths (e.g., "/code/myproject")
  are acceptable.
* **arch** The target build architecture to use (default will match local machine)

### defaults

*This section is optional.* Define default values for the sections described later.
This section allows you to specify the default environment variables, host login
settings, etc. that will be used as the basis for all similar configuration later
on in the file.

* **hosts** Object defining default values for all members of `hosts`
* **services** Object defining default vars for all services (`env` and/or `settingsPath`)

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
of the application code with a distinct name and (optionally) different environment
variables. The keys for each service are:

* **name** Name of the service. Used in init scripts. No spaces.
* **settingsPath** Local path to a Meteor settings.json for this service.

By default, invocations to `rock init` will create bare Meteor settings file with a
filename which includes the environment (e.g., "production.settings.json"). So, for
an environment named production, the default rockup file will specify a `settingsPath`
of "./production.settings.json". You can override this globally in `defaults` or
per-service.

* **env** Object definining the environment variables that will be applied for this
  service instance only.

Here's a sample `hosts` declaration that specifies two hosts each with two services.
Services on the second host have overridden settings paths:

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
      { "name": "myapp1", "settingsPath": "./alternate1.settings.json", "env": { "PORT": 8081 } },
      { "name": "myapp2", "settingsPath": "./alternate2.settings.json", "env": { "PORT": 8082 } }
    ]
  }
]
```

### hooks

_(Work in progress)_

Specify scripts that will be execute at key moments in the build and deploy process.
These can be useful for moving prerequisite code around or housecleaning your build
machine before and after.

* **preBuild** Run prior to invoking `meteor build` to build the app bundle
* **postDeploy** Run immediately after completion of deployment

Each hook script should be an executable file. It will be invoked from the RockUp
deployment process directly.

The **preBuild** script will receive command-line arguments, in order:

1. Environment Name (from rockup.json)
2. Application Name (from rockup.json)
3. Path to application root

The **postDeploy** script will receive the command-line arguments, in order:

1. Environment Name (from rockup.json)
2. Application Name (from rockup.json)
3. Release Name (the r-prefixed timestamp of the release folder on targets)

If your hook scripts exit with non-zero status, deployment will be held up at the time
of invocation. You can use this to cancel a deployment if pre-build prerequisites are not
met or to note a deployment failure after a post-deployment check.

_Work in progress also coming on server-side hook scripts._

### Verification

You can use the `rock info` command to view the details and vet your rockup file.
This command will verify local paths to your application, Meteor settings, and other
files exist and are accurate. It will also display to you the configuration variables
each service will receive, and highlight features of your environment.

This can be an invaluable tool when making changes to your environment's configuration
which will make sure your changes are valid.

The `--detail` (or `-d`) flag will output the compiled JSON rockup file, which includes
the full definitions with values from `defaults` injected where needed. This can be
useful for debugging configuration quirks.


## Installing On Host Servers

Once your environment is well-described in a rockup.json file, you will want
to prepare your host servers to receive deployments:

`rock prep production`

This command logs onto your host servers and prepares app service directories
that will receive code pushes, store configuration, and serve bundled versions
of your app. 

Prepare performs these actions:

* Creates directory under "/opt" (e.g., "/opt/myapp"), which will contain
  source code, release histories, and configurations
* Registers an upstart service for each service specified in rockup configuration

Preparation should be performed each time you add a new host or add a new service
to an existing host. The steps it performs are idempotent and can be re-run without
danger.

By default, `rock prep` will run this setup on _every_ host described in the rockup
file. It is possible to limit the invocation to a single host by specifying `--host`
on the command, such as:

`rock prep production --host prod2.myco.com`


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

Similar to the prepare command, you may target deployment to a specific host using
the `--host` CLI flag (e.g., `rock deploy production --host app1.com`).

If you have a custom process for building Meteor application bundles or have an app
bundle on hand, you can skip the _build_ portion of deployment by providing the
path to the existing bundle on the command-line. Bundles must be gzipped tarballs
containing the output of a `meteor build` invocation to work properly:

`rock deploy production --bundle ./path/to/my/custom/bundle.tar.gz`

Deployment happens to all hosts in parallel.

### Configuration-Only Deployment

The `rock deploy` command will bundle and push your application code alongside your
configuration. If you've only made changes to configuration, however, it can be
significantly faster to push only configuration. For that, we have `rock reconfig`.

Usage: `rock reconfig production`

Reconfiguration is a simple subset of deployment which:

1. Copies configuration over existing configuration _for the current release_
2. And restarts each service

Configuration changes this is useful are:

* **Environment Variables**: Changes to `hosts.services.env` in rockup file
* **Meteor Settings**: Changes to settings.json

Like deployment, you can also limit reconfiguration to a single host using `--host`.

## Recovery

### Release History

You can ask your hosts for a list of past deployments using the history command. This
command will SSH onto each host specified in the rockup.json file and query the list
of existing releases. Example with output:

```
$> rock history production

  Release                 Hosts
  r20160610_203648        All (3)
  r20160605_185924        All (3)
  r20160531_182809        All (3)
  r20160531_180542        Some (1) dev1
  * currents highlighted
```

The `history` command will reveal which hosts the releases exists on, as well, so you can
make decisions for rollback, etc.

### Release Rollback

You can rollback to the previous release from the command-line:

`rock rollback production`

You can also rollback to a _specific_ previous release:

`rock rollback production --release r20160605_185924`

Rolling back takes the following steps on each host:

1. Changes the /opt/myapp/current symlink to point to specified release
2. Restarts all services


## Service Life Cycle Commands

### Status

You can check the running status of your application services using `rock status`.
The command will output the status of every host and service in your environment:

```
$> rock status production

app1.emmerge.com   running   { 'app-0': 'running', 'app-1': 'running' }
app2.emmerge.com   stopped   { 'app-0': 'stopped', 'app-1': 'stopped' }
app3.emmerge.com   partial   { 'app-0': 'running', 'app-1': 'stopped' }
```

Possible statuses include:

* **running** All services on host running
* **stopped** All services on host not running
* **partial** Services are in different status on host
* **unknown** Services specified in rockup file cannot be found/checked on host

This tool can be used to diagnose issues in your environment.

### Start, Stop, Restart

You can directly manipulate the status of your running services using the 
lifecycle commands: `rock start`, `rock stop`, and `rock restart`. The command
will return a listing of command success for each service on each host:

```
$> rock start production

```

The array of service results for each host will include boolean values indicating
whether or not the command succeeded for each service.

Depending on the service management toolset of your host, you can receive failures
for some perfectly acceptable cases:

* Service does not exist -- check rockup file
* Trying to start/stop a service that is already started/stopped -- check status

### Logging

Your services will log on your machine to the configured upstart service directory.
By default, the file is named of the form "/var/log/upstart/yourapp.log" and will have
log rotation enabled (depending on host configuration).

You can tail these logs from the host machine yourself, or get a quick glance through
the `rockup logs` command.

This command will log onto hosts and tail the service logs for running/active services
to your console. To cut back on noise, if it is applicable to your debugging case, you
can limit the log output using the `--host` flag.



2016 Emmerge, Inc.
