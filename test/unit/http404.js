'use strict';

var assert = require('assert');
var sinon = require('sinon');
var httpMocks = require('@cantremember/node-mocks-http');

var theHelper = require('../helper');
var willHandle = require('../../app/http404');


describe('http404', function() {
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


    it('will render its page', function() {
        return willHandle(req, res, cb)
        .then(function() {
            assert(! cb.called);

            assert.equal(res._getRenderView(), 'http404.ejs');
            assert.equal(res._getData(), 'http404.ejs');
            assert.equal(res.statusCode, 200);
        });
    });

    it('will fail gracefully', function() {
        sandbox.stub(res, 'render').throws(new Error('BOOM'));
        sandbox.spy(res, 'send');

        willHandle(req, res, cb)
        .then(theHelper.notCalled, function(err) {
            assert.equal('BOOM', err.message);

            assert(res.render.calledOnce);
            assert(! res.send.called);

            // Express gets informed
            assert(cb.called);
            assert.strictEqual(cb.args[0][0], err);
        });
    });
});
