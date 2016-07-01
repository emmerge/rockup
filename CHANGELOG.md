RockUp ChangeLog
================

RockUp is used in production, but is still in development itself.

## v0.0.6 - July 1, 2016

* Add: preBuild and postDeploy hook script support
* Fix: Deploy tasks now properly restart app services using lifecycle task
* Change: MIT License

## v0.0.5 - June 27, 2016

* Add: Specify app.arch in rockup.json to build for different target architecture
* Fix: Convert lifecycle commands to use service-subcommand style
* Small: Vast README updates
* Small: New --help and rock help details

## v0.0.4 - June 24, 2016

* Fix: Host/service preparation properly permissions target directories and scripts

## v0.0.3 - June 23, 2016

* Fix: Remove bash assumptions from service upstart script
* Optimize: Manage build chain with better error capture
* Optimize: Fix corner cases for build-and-deploy flow
* Small: Cleanup CLI output

## v0.0.2 - June 16, 2016

* Fix: settingsPath load on target host
* Add: -H acceptable shorthand for --host in all CLI commands
* Add: rock rollback CLI command
* Optimize: Convert host/service preparation to task list

## v0.0.1

Initial release.
