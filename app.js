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


// specify the httpPort
theLib.config.set(
    'httpPort',
    params.port || process.env['HTTP_PORT'] || theLib.config.get('httpPort')
);
if (! theLib.config.get('httpPort')) {
    console.error(['Usage:  ', path.basename(__filename), ' --port <PORT>'].join(''));
    process.exit(1);
}
console.log('http port is:', theLib.config.get('httpPort'));

// specify the wwwRoot
theLib.config.set(
    'wwwRoot',
    process.env['WWW_ROOT'] || theLib.config.get('wwwRoot')
);
console.log('WWW root is:', theLib.config.get('wwwRoot'));


// ready to listen!
theLib.app.listen(theLib.config.get('httpPort'));
