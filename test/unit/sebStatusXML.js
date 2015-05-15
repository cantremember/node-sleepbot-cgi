'use strict';

const assert = require('assert');
const sinon = require('sinon');
const httpMocks = require('@cantremember/node-mocks-http');
const proxyquire = require('proxyquire');

const theLib = require('../../lib/index');
const theHelper = require('../helper');
const HANDLER_PATH = '../../app/sebStatusXML';


describe('sebStatusXML', () => {
    let sandbox;
    let cb;
    let req, res;

    beforeEach(() => {
        // own own private sandbox
        sandbox = sinon.sandbox.create();
        cb = sandbox.spy();

        // mock Request & Response
        req = httpMocks.createRequest();
        res = httpMocks.createResponse();
    });
    afterEach(() => {
        sandbox.restore();
    });


    it('proxies from the primary Shoutcast server', () => {
        const request = sandbox.spy((options, cb) => {
            const primary = theLib.config.get('sebServerPrimary');

            // some basics
            assert.equal(options.uri.indexOf(primary.url), 0);
            assert(options.uri.match(/mode=viewxml$/));
            assert.equal(options.auth.user, primary.user);
            assert.equal(options.auth.pass, primary.pass);

            cb(null, options, 'BODY');
        });

        return proxyquire(HANDLER_PATH, {
            request: request,
            '@noCallThru': false,
        })(req, res, cb)
        .then(() => {
            assert(! cb.called);
            assert(request.calledOnce);

            assert.deepEqual(res._headers, { 'Content-Type': 'text/xml' });
            assert.equal(res.statusCode, 200);
            assert.equal(res._getData(), 'BODY');
        });
    });

    it('will fail gracefully', () => {
        const request = sandbox.stub().throws(new Error('BOOM'));
        sandbox.spy(res, 'send');

        return proxyquire(HANDLER_PATH, {
            request: request,
            '@noCallThru': false,
        })(req, res, cb)
        .then(theHelper.notCalled, (err) => {
            assert.equal(err.message, 'BOOM');

            assert(request.calledOnce);
            assert(! res.send.called);

            // Express gets informed
            assert(cb.called);
            assert.strictEqual(cb.args[0][0], err);
        });
    });
});
