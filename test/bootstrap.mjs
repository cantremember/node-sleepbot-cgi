/*
  bootstrapping for `mocha`
*/

import assert from 'assert';
import sinon from 'sinon';

/* eslint-disable no-unused-vars */
// modules which must be loaded before Promise.promisify
import mockFs from 'mock-fs';
/* eslint-enable no-unused-vars */


const sandbox = sinon.createSandbox();
let unhandledRejection;
let globalErr;

// disregard 'uncaughtException'

beforeEach(() => {
  unhandledRejection = sandbox.spy((err) => {
    globalErr = err;
  });
  process.on('unhandledRejection', unhandledRejection);
});

afterEach(() => {
  process.removeListener('unhandledRejection', unhandledRejection);
  assert.ifError(globalErr);
});
