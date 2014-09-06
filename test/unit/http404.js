'use strict';

var assert = require('assert');
var sinon = require('sinon');
var Promise = require('bluebird');

var theLib = require('../../lib/index');
var theHelper = require('../helper');
var willHandle = require('../../app/http404');


describe('http404', function() {
    var sandbox;
    var req, res;
    beforeEach(function() {
        // own own private sandbox
        sandbox = sinon.sandbox.create();

        // mock Request & Response
        req = theHelper.mockRequest(sandbox);
        res = theHelper.mockResponse(sandbox);
    });
    afterEach(function() {
        sandbox.restore();
    });


    it('will render its page', function(done) {
        willHandle(req, res).then(function() {
            assert(res.render.calledOnce);
            assert(res.send.calledOnce);
        }).nodeify(done);
    });

    it('will fail gracefully', function(done) {
        res.render = theHelper.throws(new Error('BOOM'));
        willHandle(req, res).done(theHelper.notCalled, function(err) {
            assert.equal('BOOM', err.message);
            assert(! res.send.called);

            done();
        });
    });
});
