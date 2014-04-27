'use strict';

var assert = require('assert');
var sinon = require('sinon');
var Promise = require('bluebird');

var theLib = require('../../lib/index');
var theHelper = require('../helper');
var willHandle = require('../../app/redirectToRandomFile');


describe('redirectToRandomFile', function() {
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

    var handle;
    beforeEach(function() {
        handle = willHandle('path', 'glob');
    });


    it('will redirect to a ', function(done) {
        sandbox.stub(theLib.wwwRoot, 'willGetFilenames', function(pathname) {
            assert.equal('path/glob', pathname);

            return Promise.resolve([ 'foo' ]);
        });
        handle(req, res).then(function() {
            assert(res.redirect.calledOnce);
            assert.deepEqual([
                theLib.baseURL('path/foo')
            ], res.redirect.firstCall.args)
        }).nodeify(done);
    });

    it('will fail gracefully', function(done) {
        sandbox.stub(theLib.wwwRoot, 'willGetFilenames').throws(new Error('BOOM'));
        handle(req, res).done(theHelper.notCalled, function(err) {
            assert.equal('BOOM', err.message);
            assert(! res.send.called);

            done();
        });
    });
});
