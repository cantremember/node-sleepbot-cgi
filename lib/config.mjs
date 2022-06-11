/* eslint-disable no-console */

import { URL } from 'url';
import fs from 'fs';
import path from 'path';
import nconf from 'nconf';
import { cloneDeep } from 'lodash-es';

// hard-coded path
const __DIRNAME = path.dirname(new URL(import.meta.url).pathname);
const CONFIG_PATH = path.normalize(
  path.join(__DIRNAME, '../config')
);

export const FILE_DEFAULT = 'file/default';


function _loadStore(env) {
  const filepath = path.join(CONFIG_PATH, `${ env }.json`);

  return JSON.parse(fs.readFileSync(filepath)); // eslint-disable-line no-sync
}

function _transformStore(config) {
  const mutated = cloneDeep(config);
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

export function getConfigForEnvironment(environment) {
  const config = (new nconf.Provider())
    .add('mock', { type: 'literal', store: {} }) // @see test/helper#mockConfig
    .add('memory')
    .argv()
    .env()
  ;

  // ENV-driven defaults
  try {
    if (environment) {
      config.add(`file/${ environment }`, {
        type: 'literal',
        store: _transformStore(_loadStore(environment)),
      });
      console.log('environment is:', environment);
    }
  }
  catch (err) {
    console.log('invalid environment:', environment, ':', err);
  }

  // baseline defaults
  config.add(FILE_DEFAULT, {
    type: 'literal',
    store: _transformStore(_loadStore('default')),
  });

  // (roughly) what we were asked for;
  //   and it can't be `undefined` -- that causes fallback
  config.set('NODE_ENV', environment || '');

  return config;
}


const _environment = process.env.NODE_ENV || '';
const singleton = getConfigForEnvironment(_environment);
// because `export { default }`
singleton.FILE_DEFAULT = FILE_DEFAULT;

export {
  singleton as default,
};
