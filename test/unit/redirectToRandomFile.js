'use strict';

var assert = require('assert');
var sinon = require('sinon');
var httpMocks = require('@cantremember/node-mocks-http');

var theLib = require('../../lib/index');
var theHelper = require('../helper');
var willHandle = require('../../app/redirectToRandomFile');


describe('redirectToRandomFile', function() {
    var sandbox;
    var req, res;
    var handle;
    beforeEach(function() {
        // own own private sandbox
        sandbox = sinon.sandbox.create();

        // mock Request & Response
        req = httpMocks.createRequest();
        res = httpMocks.createResponse();

        handle = willHandle('path', 'some-glob');
    });
    afterEach(function() {
        sandbox.restore();
    });


    it('will redirect to a route relative to baseURL', function() {
        theHelper.mockGlob(sandbox, function() {
            return [ 'glob.file' ];
        });

        return handle(req, res)
        .then(function() {
            assert.equal(res._getRedirectUrl(), theLib.baseURL('path/glob.file'));
        });
    });

    it('fails without any files', function() {
        theHelper.mockGlob(sandbox, function() {
            return [];
        });

        return handle(req, res)
        .then(theHelper.notCalled, function(err) {
            assert(err.message.match(/no glob results/));
        });
    });

    it('will fail gracefully', function() {
        theHelper.mockGlob(sandbox, function() {
            throw new Error('BOOM');
        });
        sandbox.stub(res, 'send');

        return handle(req, res)
        .then(theHelper.notCalled, function(err) {
            assert.equal('BOOM', err.message);

            assert(! res.send.called);
        });
    });
});