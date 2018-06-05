/*
  bootstrapping for `mocha`
*/

import assert from 'assert';
import sinon from 'sinon';
import theHelper from './helper';

// non-HTTP `net.socket` mocking
//   must be executed before any import of 'net'
//   engaged by `theHelper.mitm.enable()`
theHelper.mitm.disable();

// "For disabling real http requests."
//   except to `superagent` / `supertest`
//   and only upon `nock.activate()`
import nock from 'nock';
nock.disableNetConnect();
nock.enableNetConnect('127.0.0.1');
nock.restore();


const sandbox = sinon.createSandbox();
let unhandledRejection;
let globalErr;

// disregard 'uncaughtException'

beforeEach(() => {
  nock.restore();
  nock.activate();

  unhandledRejection = sandbox.spy((err) => {
    globalErr = err;
  });
  process.on('unhandledRejection', unhandledRejection);
});

afterEach(() => {
  nock.restore();

  process.removeListener('unhandledRejection', unhandledRejection);
  assert.ifError(globalErr);
});
