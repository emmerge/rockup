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

Initialize a local project configuration: `rock init`

Install the (new) services specified in a configuration: `rock install production`


## Deployment

Deployment: `rock deploy <environment> [options]`

Deploy app to all hosts and all services in production: `rock deploy production`

Deploy all services on a single host: `rock deploy production -h app1`

Deploy only a single service: `rock deploy production -h app1 -s thred2`

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
