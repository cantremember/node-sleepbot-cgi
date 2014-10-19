#!/usr/bin/env node
/*
  ENV
    HTTP_PORT
    WWW_ROOT
    ...
    NODE_ENV
    BLUEBIRD_DEBUG=1
    NODE_CONFIG_DIR=./config

  /etc/init.d
    https://github.com/nodejitsu/forever

  TODO
    https://github.com/lorenwest/node-config
    https://github.com/trentm/node-bunyan
*/

'use strict';

var path = require('path');
var theLib = require('./lib/index');


// could from the command line
var params = (function() {
    var argv = process.argv;
    var i = argv.indexOf(__filename);
    var rest = argv.slice(i + 1);

    var minimist = require('minimist');
    return minimist(rest, {
        alias: { port: 'p' }
    });
})();

// could come from ENV
params.port = params.port || process.env['HTTP_PORT'];

// or from configuration
params.port = params.port || theLib.config.httpPort;

if (! params.port) {
    console.error(['Usage:  ', path.basename(__filename), ' --port <PORT>'].join(''));
    process.exit(1);
}

// expand upon configuration
theLib.config.wwwRoot = process.env['WWW_ROOT'] || theLib.config.wwwRoot;
console.log('WWW root is:', theLib.config.wwwRoot)

console.log('http port is:', params.port)


var app = theLib.app;
app.listen(params.port);
