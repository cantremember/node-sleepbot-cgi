/* eslint-disable no-console */

/*
  TODO:  make this work with ESModules
    this was originally built for dynamic synchronous `require()`.
    the config files were JavaScript; they could have methods, comments, etc.
    the filename to ("dynamically") load was NODE_ENV-driven

  synchronous `require()`
    "Dynamic Imports" -- `import('file:///path/to/file')` -- returns a Promise
    we'd need to make access to the config 100% asynchronous
    instead, i shifted to making the config files pure JSON;
    a synchronous load-and-parse removes the need for `require()` or `import()`
  `__dirname` replaced by `import.meta.url`
    specifically, `import('path').dirname( import('url').parse( import.meta.url ).path )`
    that worked just fine ... but then
  ESLint: "Parsing error: Unexpected token import"
    https://github.com/eslint/eslint/issues/8789
    2017-Jun-23: "Dynamic import is a stage 3 proposal, and it's still an experimental feature."
    no amount of `// eslint-ignore` fixes the error
  so
    this file is *not* an ESModule

  TODO: integrate it nicely with test/helpers
*/

const fs = require('fs');
const path = require('path');
const nconf = require('nconf');
const _ = require('lodash');

const CONFIG_PATH = path.normalize(
  path.join(__dirname, '../config')
);
const FILE_DEFAULT = 'file/default';

function loadStore(env) {
  const filepath = path.join(CONFIG_PATH, `${ env }.json`);

  return JSON.parse(fs.readFileSync(filepath)); // eslint-disable-line no-sync
}

function transformStore(config) {
  const mutated = _.cloneDeep(config);
  const {
    viewsRoot, // relative to the 'config/' directory, unless absolute
  } = mutated;

  /* istanbul ignore else */
  if (viewsRoot !== undefined) {
    const normalized = (viewsRoot.startsWith('/')
      ? viewsRoot
      : path.normalize( path.join(CONFIG_PATH, viewsRoot) )
    );
    mutated.viewsRoot = normalized;
  }

  return mutated;
}


const singleton = (new nconf.Provider())
  .add('mock', { type: 'literal', store: {} }) // @see test/helper#mockConfig
  .add('memory')
  .argv()
  .env()
;

// ENV-driven defaults
const env = singleton.get('NODE_ENV');
try {
  if (env) {
    singleton.add(`file/${ env }`, {
      type: 'literal',
      store: transformStore(loadStore(env)),
    });
    console.log('environment is:', env);
  }
}
catch (err) {
  console.log('invalid environment:', env, ':', err);
}

// baseline defaults
singleton.add(FILE_DEFAULT, {
  type: 'literal',
  store: transformStore(loadStore('default')),
});


/**
 * #### Hierarchical configuration, using [nconf](https://www.npmjs.com/package/nconf)
 *
 * &nbsp;
 *
 * @namespace config
 */
module.exports = singleton;


singleton.FILE_DEFAULT = FILE_DEFAULT;
