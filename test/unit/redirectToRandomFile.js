'use strict';

const assert = require('assert');
const sinon = require('sinon');
// TODO:  node-mocks-http@^1.5.2, once Request#render(cb)
const httpMocks = require('@cantremember/node-mocks-http');

const theLib = require('../../lib/index');
const theHelper = require('../helper');
const willHandle = require('../../app/redirectToRandomFile');


describe('redirectToRandomFile', () => {
    let sandbox;
    let req, res;
    let handle;
    beforeEach(() => {
        // own own private sandbox
        sandbox = sinon.sandbox.create();

        // mock Request & Response
        req = httpMocks.createRequest();
        res = httpMocks.createResponse();

        handle = willHandle('path', 'some-glob');
    });
    afterEach(() => {
        sandbox.restore();
    });


    it('will redirect to a route relative to baseURL', () => {
        theHelper.mockGlob(sandbox, () => {
            return [ 'glob.file' ];
        });

        return handle(req, res)
        .then(() => {
            assert.equal(res._getRedirectUrl(), theLib.baseURL('path/glob.file'));
        });
    });

    it('fails without any files', () => {
        theHelper.mockGlob(sandbox, () => {
            return [];
        });

        return handle(req, res)
        .then(theHelper.notCalled, (err) => {
            assert(err.message.match(/no glob results/));
        });
    });

    it('will fail gracefully', () => {
        theHelper.mockGlob(sandbox, () => {
            throw new Error('BOOM');
        });
        sandbox.stub(res, 'send');

        return handle(req, res)
        .then(theHelper.notCalled, (err) => {
            assert.equal('BOOM', err.message);

            assert(! res.send.called);
        });
    });
});
