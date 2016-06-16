# n.b. this is Bourne shell not bash

settings_path="<%= settings_path %>"

<% for(var key in env) { -%>
export <%- key %>="<%- env[key] %>"
<% } -%>
export METEOR_SETTINGS="$(cat "${settings_path}")"
