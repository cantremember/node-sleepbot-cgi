'use strict';

var assert = require('assert');
var sinon = require('sinon');
var httpMocks = require('@cantremember/node-mocks-http');
var proxyquire = require('proxyquire');

var theLib = require('../../lib/index');
var theHelper = require('../helper');
var HANDLER_PATH = '../../app/sebStatusXML';


describe('sebStatusXML', function() {
    var sandbox;
    var cb;
    var req, res;

    beforeEach(function() {
        // own own private sandbox
        sandbox = sinon.sandbox.create();
        cb = sandbox.spy();

        // mock Request & Response
        req = httpMocks.createRequest();
        res = httpMocks.createResponse();
    });
    afterEach(function() {
        sandbox.restore();
    });


    it('proxies from the primary Shoutcast server', function() {
        var request = sandbox.spy(function(options, cb) {
            var primary = theLib.config.get('sebServerPrimary');

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
        .then(function() {
            assert(! cb.called);
            assert(request.calledOnce);

            assert.deepEqual(res._headers, { 'Content-Type': 'text/xml' });
            assert.equal(res.statusCode, 200);
            assert.equal(res._getData(), 'BODY');
        });
    });

    it('will fail gracefully', function() {
        var request = sandbox.stub().throws(new Error('BOOM'));
        sandbox.spy(res, 'send');

        return proxyquire(HANDLER_PATH, {
            request: request,
            '@noCallThru': false,
        })(req, res, cb)
        .then(theHelper.notCalled, function(err) {
            assert.equal(err.message, 'BOOM');

            assert(request.calledOnce);
            assert(! res.send.called);

            // Express gets informed
            assert(cb.called);
            assert.strictEqual(cb.args[0][0], err);
        });
    });
});
