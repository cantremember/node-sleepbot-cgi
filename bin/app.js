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

const path = require('path');

const theLib = require('../lib/index');


const USAGE = ['Usage:  ', path.basename(__filename), ' --port <PORT>'].join('');

// values from the command line
const params = (() => {
    const argv = process.argv;
    const i = argv.indexOf(__filename);
    const rest = argv.slice(i + 1);

    const minimist = require('minimist');
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
    console.error(USAGE);
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
