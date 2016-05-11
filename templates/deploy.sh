#!/bin/bash
#
# RockUp
# Deployment Script -- Run on target server per-service


cleanup () {
  # TODO: Remove temp dir/files
  echo ""
}
trap cleanup 0

error () {
  local parent_lineno="$1"
  local message="$2"
  local code="${3:-1}"
  if [[ -n "$message" ]] ; then
    echo "Error line ${parent_lineno}: ${message}; Exiting with status ${code}"
  else
    echo "Error line ${parent_lineno}; Exiting with status ${code}"
  fi
  exit "${code}"
}
trap 'error ${LINENO}' ERR

#----------------------------------------------------------

unpack_bundle () {
  BUILD_DIR="$1"
  BUNDLE_DIR="$2"
  cd ${BUILD_DIR}
  sudo rm -rf bundle
  sudo tar xvzf bundle.tar.gz > /dev/null
  sudo chmod -R +x *
  sudo chmod -R ${USER} ${BUNDLE_DIR}
  cd -
}

rebuild_modules () {
  MODULE_DIR="$1"

  check_for_binary_modules () {

  }

  build_dependency_modules () {

  }

  build_primary_modules () {

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

place_app () {
  local parent_dir="/opt/<%= appName %>"
  local source_dir="/tmp/bundle"
  local target_dir=`date "+r%Y%m%d_%H%M%S"`     # TODO: Include version in dir
  local symlink_name="current"

  cd ${parent_dir}

  # Find most recent, oldest, and number of previous releases:
  local prev_release=`ls -d1 r*/ | tail -n 1`
  local oldest_release=`ls -d1 r*/ | head -n 1`
  local num_releases=`ls -d1 r*/ | wc -l | xargs`
  
  echo "${num_releases} release(s) are tracked in history"
  echo " - Previous release: ${prev_release}"
  echo " - Oldest release: ${oldest_release}"
  echo " - New release will be: ${target_dir}"

  # Copy bundle source into new release directory
  mv ${source_dir} ${target_dir}

  # Symlink to new source directory
  if [ -d ${symlink_name} ]; then; rm ${symlink_name}; fi
  ln -s ${target_dir} ${symlink_name}

  # Remove oldest release directory if limit reached
  if [ ${num_releases} -gt 3 ]; then
    if [ -d ${oldest_release} ]; then; 
      rm -rf ${oldset_release}; 
    fi
  fi

  cd -
}

rollback_app () {

}

restart_app () {
  sudo stop <%= appName %> || :
  sudo start <%= appName %> || :
}

check_app_is_up () {
  . /opt/<%= appName %>/config/env.sh
  curl localhost:${PORT} || rollback_app
}

#----------------------------------------------------------

TMP_DIR=/opt/<%= appName %>/tmp
BUNDLE_DIR=${TMP_DIR}/bundle

# Unravel bundle:
unpack_bundle ${TMP_DIR} ${BUNDLE_DIR}

# Build dependencies:
rebuild_modules "${BUNDLE_DIR}/programs/server"

# Restructure folders for new app code:
place_app

# Restart the app service with new code and check it's live:
restart_app
check_app_is_up

# chown to support dumping heapdump and etc
sudo chown -R meteoruser current
