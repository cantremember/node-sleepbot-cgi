'use strict';

var assert = require('assert');
var sinon = require('sinon');
var mockfs = require('mock-fs');
var httpMocks = require('node-mocks-http');

var theLib = require('../../lib/index');
var theHelper = require('../helper');
var willHandle = require('../../app/lookitAnyStory');


describe('lookitAnyStory', function() {
    var sandbox;
    var cb;
    var req, res;
    beforeEach(function() {
        // own own private sandbox
        sandbox = sinon.sandbox.create();
        cb = sandbox.spy();

        // mock Request & Response
        req = httpMocks.createRequest(sandbox);
        res = httpMocks.createResponse(sandbox);

        sandbox.spy(theLib.wwwRoot, 'willLoadFile');
    });
    afterEach(function() {
        sandbox.restore();
        mockfs.restore();
        theHelper.mockConfig();

        theLib.forget();
        willHandle.forget();
    });


    describe('with a random file', function() {
        beforeEach(function() {
            theHelper.mockGlob(sandbox, function() {
                return [ 'glob.file' ];
            });

            mockfs({ '/mock-fs': {
                'lookit': {
                    'story': {
                        'glob.file': 'GLOB.FILE',
                    }
                },
            } });
        });

        it('produces a response', function() {
            assert(! theLib.config.get('caching'));

            return willHandle(req, res, cb)
            .then(function() {
                assert.equal(theLib.wwwRoot.willLoadFile.callCount, 1);

                assert(! cb.called);
                assert.equal(res._getData(), 'lookitAnyStory.ejs');
                assert.equal(res.statusCode, 200);

                // no caching
                assert.equal(Object.keys(willHandle.cache).length, 0);

                var context = res._getRenderData();
                assert.equal(context.body, 'GLOB.FILE');
            });
        });

        it('caches a response', function() {
            theHelper.mockConfig({ caching: true });

            return willHandle(req, res, cb)
            .then(function() {
                assert.equal(theLib.wwwRoot.willLoadFile.callCount, 1);

                assert(! cb.called);
                assert.equal(res._getData(), 'lookitAnyStory.ejs');

                assert.equal(Object.keys(willHandle.cache).length, 1);

                // and again
                res = httpMocks.createResponse(sandbox);
                return willHandle(req, res);
            })
            .then(function() {
                assert.equal(theLib.wwwRoot.willLoadFile.callCount, 1);

                assert(! cb.called);
                assert.equal(res._getData(), 'lookitAnyStory.ejs');

                assert.equal(Object.keys(willHandle.cache).length, 1);
            });
        });
    });

    it('survives with no file contents', function() {
        theHelper.mockGlob(sandbox, function() {
            return [ 'glob.file' ];
        });

        return willHandle(req, res, cb)
        .then(function() {
            assert(! cb.called);
            assert.equal(res._getData(), 'lookitAnyStory.ejs');

            var context = res._getRenderData();
            assert.strictEqual(context.body, '');
        });
    });

    it('will fail gracefully', function() {
        sandbox.stub(res, 'render').throws(new Error('BOOM'));
        sandbox.spy(res, 'send');

        return willHandle(req, res, cb)
        .then(theHelper.notCalled, function(err) {
            assert.equal(err.message, 'BOOM');

            assert(res.render.calledOnce);
            assert(! res.send.called);

            // Express gets informed
            assert(cb.called);
            assert.strictEqual(cb.args[0][0], err);
        });
    });
});
