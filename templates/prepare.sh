#!/bin/bash
#
# RockUp
# Prepare Script -- Run on target server to prepare filesystem
#  to handle deployments from RockUp
#
# This script for <%= appName %> <%= envName %>: <%= hostName %>

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

# Create /opt dirs to store app code:
sudo mkdir -p /opt/<%= appName %>/
sudo mkdir -p /opt/<%= appName %>/releases
sudo chown ${USER} /opt/<%= appName %> -R

# Ownership /etc upstart dirs:
sudo chown ${USER} /etc/init
sudo chown ${USER} /etc/

# Install deps forever, userdown, node-gyp:
sudo npm install -g forever userdown node-gyp

# Create non-privileged user for running app:
sudo useradd meteoruser || :
