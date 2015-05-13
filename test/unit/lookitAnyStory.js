'use strict';

var assert = require('assert');
var sinon = require('sinon');
var mockfs = require('mock-fs');

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
        req = theHelper.mockRequest(sandbox);
        res = theHelper.mockResponse(sandbox);

        sandbox.spy(theLib.wwwRoot, 'willLoadFile');
    });
    afterEach(function() {
        sandbox.restore();
        mockfs.restore();

        willHandle.forget();
    });


    describe('with a random file', function() {
        var caching;
        beforeEach(function() {
            caching = theLib.config.caching;

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
        afterEach(function() {
            theLib.config.caching = caching;
        });

        it('produces a response', function() {
            assert(! theLib.config.caching);

            return willHandle(req, res, cb)
            .then(function() {
                assert.equal(theLib.wwwRoot.willLoadFile.callCount, 1);

                assert(! cb.called);
                assert(res.render.calledOnce);
                assert(res.send.calledOnce);

                // no caching
                assert.equal(Object.keys(willHandle.cache).length, 0);

                var context = res.render.firstCall.args[1];
                assert.equal(context.body, 'GLOB.FILE');
            });
        });

        it('caches a response', function() {
            theLib.config.caching = true;

            return willHandle(req, res, cb)
            .then(function() {
                assert.equal(theLib.wwwRoot.willLoadFile.callCount, 1);

                assert(! cb.called);
                assert(res.render.calledOnce);
                assert(res.send.calledOnce);

                assert.equal(Object.keys(willHandle.cache).length, 1);

                return willHandle(req, res);
            })
            .then(function() {
                assert.equal(theLib.wwwRoot.willLoadFile.callCount, 1);

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
            assert(res.render.calledOnce);
            assert(res.send.calledOnce);

            var context = res.render.firstCall.args[1];
            assert.strictEqual(context.body, '');
        });
    });

    it('will fail gracefully', function() {
        res.render = sandbox.stub().throws(new Error('BOOM'));

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
