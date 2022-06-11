import assert from 'assert';

import theHelper from '../../helper.mjs';
// TODO:  import ... assert { type: 'json' };
//   required by Node 16, unsupported by ESLint 8.x
//   https://github.com/eslint/eslint/discussions/15305
import { readFileSync } from 'fs';
// import configTest from '../../../config/test.json' assert { type: 'json' };
// import configDefault from '../../../config/default.json' assert { type: 'json' };
const configTest = JSON.parse(readFileSync(new URL('../../../config/test.json', import.meta.url)));
const configDefault = JSON.parse(readFileSync(new URL('../../../config/default.json', import.meta.url)));

import theConfig, {
  FILE_DEFAULT,
  getConfigForEnvironment,
} from '../../../lib/config.mjs';


describe('lib/config', () => {
  let config;
  let env;

  beforeEach(() => {
    env = process.env.NODE_ENV;
  });
  afterEach(() => {
    process.env.NODE_ENV = env;

    theHelper.mockConfig();
  });


  it('assumes the test environment', () => {
    assert.equal(process.env.NODE_ENV, 'test');

    assert.equal(theConfig.get('NODE_ENV'), 'test');
    assert.equal(theConfig.get('wwwRoot'), configTest.wwwRoot);
    assert.equal(theConfig.get('httpPort'), configDefault.httpPort);
  });


  it('provides a test environment', () => {
    config = getConfigForEnvironment('test');

    assert.deepEqual(
      Object.keys(config.stores),
      [ 'mock', 'memory', 'argv', 'env', 'file/test', FILE_DEFAULT ]
    );

    assert.equal(config.get('NODE_ENV'), 'test');
    assert.equal(config.get('wwwRoot'), configTest.wwwRoot);
    assert.equal(config.get('httpPort'), configDefault.httpPort);
  });

  it('provides no environment', () => {
    config = getConfigForEnvironment();

    assert.deepEqual(
      Object.keys(config.stores),
      [ 'mock', 'memory', 'argv', 'env', FILE_DEFAULT ]
    );

    assert.strictEqual(config.get('NODE_ENV'), '');
    assert.equal(config.get('wwwRoot'), configDefault.wwwRoot);
    assert.equal(config.get('httpPort'), configDefault.httpPort);
  });

  it('survives an invalid environment', () => {
    config = getConfigForEnvironment('BOGUS');

    assert.deepEqual(
      Object.keys(config.stores),
      [ 'mock', 'memory', 'argv', 'env', FILE_DEFAULT ]
    );

    assert.equal(config.get('NODE_ENV'), 'BOGUS');
    assert.equal(config.get('wwwRoot'), configDefault.wwwRoot);
    assert.equal(config.get('httpPort'), configDefault.httpPort);
  });


  it('overrides with process.env values', () => {
    // using the exact naming of the JSON keys
    process.env.httpPort = '9001';

    config = getConfigForEnvironment('test');

    assert.equal(config.get('NODE_ENV'), 'test');
    assert.equal(config.get('wwwRoot'), configTest.wwwRoot);
    assert.equal(config.get('httpPort'), '9001');
  });
});
