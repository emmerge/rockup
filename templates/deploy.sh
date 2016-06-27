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

# 2. Rebuild app npm/node dependencies

rebuild_modules () {
  MODULE_DIR="$1"

  gyp_rebuild_inside_node_modules () {
    for npmModule in ./*; do
      cd $npmModule

      isBinaryModule="no"
      # recursively rebuild npm modules inside node_modules
      check_for_binary_modules () {
        if [ -f binding.gyp ]; then
          isBinaryModule="yes"
        fi

        if [ $isBinaryModule != "yes" ]; then
          if [ -d ./node_modules ]; then
            cd ./node_modules
            for module in ./*; do
              cd $module
              check_for_binary_modules
              cd ..
            done
            cd ../
          fi
        fi
      }

      check_for_binary_modules

      if [ $isBinaryModule = "yes" ]; then
        echo " > $npmModule: npm install due to binary npm modules"
        rm -rf node_modules
        if [ -f binding.gyp ]; then
          sudo npm install
          sudo node-gyp rebuild || :
        else
          sudo npm install
        fi
      fi

      cd ..
    done
  }

  rebuild_binary_npm_modules () {
    for package in ./*; do
      if [ -d $package/node_modules ]; then
        cd $package/node_modules
          gyp_rebuild_inside_node_modules
        cd ../../
      elif [ -d $package/main/node_module ]; then
        cd $package/node_modules
          gyp_rebuild_inside_node_modules
        cd ../../../
      fi
    done
  }

  cd ${MODULE_DIR}
  if [ -d ./npm ]; then
    cd npm
    rebuild_binary_npm_modules
    cd -
  fi

  if [ -d ./node_modules ]; then
    cd ./node_modules
    gyp_rebuild_inside_node_modules
    cd -
  fi

  if [ -f package.json ]; then
    sudo npm install
  else
    # backwards compat support
    sudo npm install fibers
    sudo npm install bcrypt
  fi

  cd ${app_parent_dir}
}

rebuild_modules "${bundle_dir}/programs/server"


# 3. Move the fully compiled bundle to being app

cd ${app_release_dir}
sudo mv bundle app                                  # Rename bundle app (target is: /opt/<%=appName%>/releases/<%=releaseName%>/app)

# 4. Symlink app_parent_dir/current => app_release_dir/app

cd ${app_parent_dir}
sudo rm -f current                                  # Removes existing current link /opt/<%=appName%>/current
sudo ln -s ${app_release_dir} ./current             # Creates new current link to new release

# PRE: app_release_dir/config contains env.sh and settings.json for each service

# 5. For each service, restart the service

<% for(var service in serviceNames) { %>
  echo "Starting Service: <%= service %>"
  sudo service <%= service %> stop || :
  sudo service <%= service %> start || :
<% } %>

# chown to support dumping heapdump and etc
cd ${app_release_dir}
sudo chown -R meteoruser app
