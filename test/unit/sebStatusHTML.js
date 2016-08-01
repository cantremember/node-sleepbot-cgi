const assert = require('assert');
const sinon = require('sinon');
// TODO:  node-mocks-http@^1.5.2, once Request#render(cb)
const httpMocks = require('@cantremember/node-mocks-http');
const proxyquire = require('proxyquire');

const theLib = require('../../lib/index');
const theHelper = require('../helper');
const HANDLER_PATH = '../../app/sebStatusHTML';


describe('sebStatusHTML', () => {
    let sandbox;
    let cb;
    let req;
    let res;

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
        const request = sandbox.spy((options, _cb) => {
            const primary = theLib.config.get('sebServerPrimary');

            // some basics
            assert.equal(options.uri.indexOf(primary.url), 0);
            assert(options.uri.match(/7.html$/));

            _cb(null, options, 'BODY');
        });

        return proxyquire(HANDLER_PATH, {
            request,
            '@noCallThru': false,
        })(req, res, cb)
        .then(() => {
            assert(! cb.called);
            assert(request.calledOnce);

            assert.deepEqual(res._headers, { 'Content-Type': 'text/html' });
            assert.equal(res.statusCode, 200);
            assert.equal(res._getData(), 'BODY');
        });
    });

    it('will fail gracefully', () => {
        const request = sandbox.stub().throws(new Error('BOOM'));
        sandbox.spy(res, 'send');

        return proxyquire(HANDLER_PATH, {
            request,
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
