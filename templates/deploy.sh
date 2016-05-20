#!/bin/bash
#
# RockUp
# Deployment Script -- Run on target server per-service

app_name="<%= appName %>"
release_name="<%= releaseName %>"
app_parent_dir="/opt/${app_name}"
app_release_dir="${app_parent_dir}/releases/${release_name}"

# PRE: app_release_dir exists
# PRE: app_release_dir contains bundle.tar.gz

# 1. Unarchive the bundle into app_release_dir/app

cd ${app_release_dir}                               # Change into directory for this release
bundle_dir="${app_release_dir}/bundle"              
sudo rm -rf bundle                                  # Remove any existing unpacked bundle
sudo tar xvzf bundle.tar.gz > /dev/null             # Extract the archive (will unpack into bundle_dir)
sudo chmod -R +x *
sudo chown -R ${USER} ${bundle_dir}
sudo mv bundle app                                  # Rename bundle app (target is: /opt/<%=appName%>/releases/<%=releaseName%>/app)

# 2. Rebuild app npm/node dependencies

rebuild_modules () {
  MODULE_DIR="$1"

  check_for_binary_modules () {
    echo "TODO"
  }

  build_dependency_modules () {
    echo "TODO"
  }

  build_primary_modules () {
    echo "TODO"
  }

  cd ${MODULE_DIR}
  if [ -d ./npm ]; then
    cd npm
    build_binary_npm_modules
    cd -
  fi

  if [ -d ./node_modules ]; then
    cd ./node_modules
    build_dependency_modules
    cd -
  fi

  if [ -f package.json ]; then
    sudo npm install
  fi
}

# 3. Symlink app_parent_dir/current => app_release_dir/app

cd ${app_parent_dir}
sudo rm -f current                                  # Removes existing current link /opt/<%=appName%>/current
sudo ln -s ${app_release_dir} ./current             # Creates new current link to new release

# PRE: app_release_dir/config contains boot.sh and settings.json for each service

# 4. For each service, restart the service

<% for(var service in serviceNames) { %>
  echo "Starting Service: <%= service %>"
  sudo stop <%= service %> || :
  sudo start <%= service %> || :
<% } %>

# chown to support dumping heapdump and etc
cd ${app_release_dir}
sudo chown -R meteoruser app
