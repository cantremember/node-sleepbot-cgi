/*
  ENV
    HTTP_PORT
    WWW_ROOT
    ...
    NODE_ENV

  TODO
    https://github.com/trentm/node-bunyan
*/
/* istanbul ignore file */
/* eslint-disable no-console */

import minimist from 'minimist';

import wwwRoot from '../lib/wwwRoot.mjs';
import theLib from '../lib/index.mjs';
import theApp from '../lib/app.mjs';


const FILENAME = 'app.mjs';
const USAGE = `Usage:  ${ FILENAME } --port <PORT>`;

// values from the command line
const params = (function(argv) {
  const i = argv.findIndex((arg) => arg.endsWith(FILENAME));
  if (i === -1) {
    console.error(USAGE);
    process.exit(1);
  }

  const rest = argv.slice(i + 1);
  return minimist(rest, {
    alias: { port: 'p' }
  });
})(process.argv);


// specify the httpPort
theLib.config.set(
  'httpPort',
  params.port || process.env.HTTP_PORT || theLib.config.get('httpPort')
);
if (! theLib.config.get('httpPort')) {
  console.error(USAGE);
  process.exit(1);
}
console.log('http port is:', theLib.config.get('httpPort'));

// specify the wwwRoot
theLib.config.set('wwwRoot', (process.env.WWW_ROOT || wwwRoot.basePath));
console.log('WWW root is:', theLib.config.get('wwwRoot'));


// long-lived
process.on('uncaughtException', (err) => {
  console.error('uncaughtException:', (err.stack || err));
});
process.on('unhandledRejection', (err) => {
  console.error('unhandledRejection:', (err.stack || err));
});


// ready to listen!
theApp.listen(theLib.config.get('httpPort'));
