#!/bin/bash

config_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
settings_path="${config_dir}/<%= settingsJson %>"

<% for(var key in env) { -%>
export <%- key %>="<%- env[key] %>"
<% } -%>
export METEOR_SETTINGS=$(<${settings_path})
