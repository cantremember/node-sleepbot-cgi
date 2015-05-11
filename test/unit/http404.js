'use strict';

var assert = require('assert');
var sinon = require('sinon');
var Promise = require('bluebird');

var theLib = require('../../lib/index');
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
        req = theHelper.mockRequest(sandbox);
        res = theHelper.mockResponse(sandbox);
    });
    afterEach(function() {
        sandbox.restore();
    });


    it('will render its page', function() {
        return willHandle(req, res, cb)
        .then(function() {
            assert(! cb.called);
            assert(res.render.calledOnce);
            assert(res.send.calledOnce);
        });
    });

    it('will fail gracefully', function() {
        res.render = theHelper.throws(new Error('BOOM'));

        willHandle(req, res, cb)
        .then(theHelper.notCalled, function(err) {
            assert.equal('BOOM', err.message);

            assert(! res.send.called);

            // Express gets informed
            assert(cb.called);
            assert.strictEqual(cb.args[0][0], err);
        });
    });
});
