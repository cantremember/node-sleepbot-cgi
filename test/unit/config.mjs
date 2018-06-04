import assert from 'assert';
import proxyquire from 'proxyquire';

import theHelper from '../helper';
import configTest from '../../config/test';
import configDefault from '../../config/default';

import theConfig from '../../lib/config';
const { FILE_DEFAULT } = theConfig;


const CONFIG_PATH = '../../lib/config';
const STUBS = Object.freeze({ '@noCallThru': false });


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


  it('provides a test environment', () => {
    assert.equal(process.env.NODE_ENV, 'test');

    config = proxyquire(CONFIG_PATH, STUBS);
    assert.deepEqual(
      Object.keys(config.stores),
      [ 'mock', 'memory', 'argv', 'env', 'file/test', FILE_DEFAULT ]
    );

    assert.equal(config.get('NODE_ENV'), 'test');
    assert.equal(config.get('wwwRoot'), configTest.wwwRoot);
    assert.equal(config.get('httpPort'), configDefault.httpPort);
  });

  it('provides no environment', () => {
    delete process.env.NODE_ENV;

    config = proxyquire(CONFIG_PATH, STUBS);
    assert.deepEqual(
      Object.keys(config.stores),
      [ 'mock', 'memory', 'argv', 'env', FILE_DEFAULT ]
    );

    assert.strictEqual(config.get('NODE_ENV'), undefined);
    assert.equal(config.get('wwwRoot'), configDefault.wwwRoot);
    assert.equal(config.get('httpPort'), configDefault.httpPort);
  });

  it('survives an invalid environment', () => {
    process.env.NODE_ENV = 'BOGUS';

    config = proxyquire(CONFIG_PATH, STUBS);
    assert.deepEqual(
      Object.keys(config.stores),
      [ 'mock', 'memory', 'argv', 'env', FILE_DEFAULT ]
    );

    assert.equal(config.get('NODE_ENV'), 'BOGUS');
    assert.equal(config.get('wwwRoot'), configDefault.wwwRoot);
    assert.equal(config.get('httpPort'), configDefault.httpPort);
  });

  it('can be overridden with mock values', () => {
    config = proxyquire(CONFIG_PATH, STUBS);
    theHelper.mockConfig({ wwwRoot: 'mock' }, config);

    assert.deepEqual(
      Object.keys(config.stores),
      [ 'mock', 'memory', 'argv', 'env', 'file/test', FILE_DEFAULT ]
    );
    assert.equal(config.get('wwwRoot'), 'mock');
    assert.equal(config.get('ntpTimeout'), configTest.ntpTimeout);
    assert.equal(config.get('httpPort'), configDefault.httpPort);
  });
});
