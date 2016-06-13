Converting from Meteor-Up
=========================

The conversion from Meteor-Up to RockUp is not complicated, but there are some
points you will want to consider for production-like and high-availability
environments during your transition.

## Host Folder Structures

On the host, RockUp and mup both use the /opt directory to store your application,
under /opt/myapp.

A mup /opt/myapp looks like this:
```
$ ll /opt/myapp
drwxr-xr-x 4 meteoruser root 4096 Apr 28 23:51 app/
drwxr-xr-x 2 ubuntu     root 4096 Apr  7  2015 config/
drwxr-xr-x 4 meteoruser root 4096 Apr 27 19:08 old_app/
```

A RockUp /opt/myapp looks like this:
```
$ ll /opt/myapp/
lrwxrwxrwx  1 ubuntu root   38 Jun 10 20:26 current -> /opt/bennett/releases/r20160610_202233/
drwxr-xr-x 10 ubuntu root 4096 Jun 10 20:38 releases/
```
With the `releases` dir looking like this:
```
$ ll /opt/myapp/releases/
drwxrwxr-x  4 ubuntu ubuntu 4096 Jun  2 15:31 r20160602_152902/
drwxrwxr-x  4 ubuntu ubuntu 4096 Jun  9 20:39 r20160609_203748/
drwxrwxr-x  4 ubuntu ubuntu 4096 Jun 10 20:26 r20160610_202233/
drwxrwxr-x  3 ubuntu ubuntu 4096 Jun 10 20:38 r20160610_203648/
```

The major difference between the two folder structures is that mup stores its current codebase under `app` and a single back version in `old_app`. It stores configuration _for both_ under `config`.

RockUp takes a release approach, so the top-level holds a container for releases which contains a series of timestamped directories. It uses a symlink `current` to point to the application release that is _currently active_. Rollbacks are handled by changing the target of this symlink.

An individual release directory in RockUp looks like this:
```
$ ll /opt/myapp/current/
drwxr-xr-x  4 ubuntu root       4096 Jun 10 20:26 app/
drwxrwxr-x  2 ubuntu ubuntu     4096 Jun 10 20:26 config/
-rwxrwxr-x  1 ubuntu ubuntu 36157066 Jun 10 20:26 bundle.tar.gz*
```

Each release holds application code under `app` and its configuration under `config`, with a reference to the uploaded bundle tarball, too.

## Host /opt Compatibility

Because the files under `/opt/myapp` are _different_ between mup (app, old_app, config) and RockUp (current, releases), there is no harm in preparing an app with RockUp "on top of" its existing mup installation.

**You can safely _prepare_ a RockUp configuration atop an existing mup configuration.**


## Host /init Compatibility

Both RockUp and mup use the **same upstart script file** based on `services.name` (RockUp) and `appName` (mup).

To overwrite an app that is already a mup app, you can take two approaches:

1. Keep the existing name (your RockUp service name matches your mup app name)
2. Name your RockUp service differently than your mup app

#### Keeping Same Service Name

Your concern will be being able to revert to using mup -- if needed -- during your transition to RockUp. To cover this case, you will want to backup your upstart script (/etc/init/myapp.conf) so you can re-insert that script should you wish to return to using mup.

#### Changing Service Name

You do not _need_ to take any specific action if your service name in RockUp does not match your mup app name.



## Before Preparing w/ RockUp

## After Successful Deploys w/ RockUp
