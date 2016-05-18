#!/bin/bash

<% for(var key in env) { %>
  export <%- key %>="<%- env[key] %>"
<% } %>

export METEOR_SETTINGS=`cat <%= settingsJson %>`
