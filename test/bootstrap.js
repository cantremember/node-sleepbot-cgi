const assert = require('assert');
const sinon = require('sinon');

// modules which must be loaded before Promise.promisify
require('mock-fs');


const sandbox = sinon.sandbox.create();
let unhandledRejection;
let globalErr;

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
