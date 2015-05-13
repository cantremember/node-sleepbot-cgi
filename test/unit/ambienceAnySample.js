'use strict';

var assert = require('assert');
var sinon = require('sinon');
var mockfs = require('mock-fs');

var theLib = require('../../lib/index');
var theHelper = require('../helper');
var willHandle = require('../../app/ambienceAnySample');

var NO_DATA = new Buffer(0);
var ANY_DATA = '\n\
file\text\tpage\tstub\tartist\talbum\ttrack\tsize\n\
file\text\tpage\tstub\tartist\talbum\ttrack\tsize\n\
';
var QUIP_DATA = '\n\
text\n\
text\n\
';


describe('ambienceAnySample', function() {
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

        sandbox.spy(theLib.wwwRoot, 'willLoadTSV');
    });
    afterEach(function() {
        sandbox.restore();
        mockfs.restore();

        willHandle.forget();
    });


    describe('with a sample and quip', function() {
        var caching;
        beforeEach(function() {
            caching = theLib.config.caching;

            mockfs({ '/mock-fs': {
                'ambience': {
                    'any.txt': ANY_DATA,
                    'anyquip.txt': QUIP_DATA,
                    'covergif': {
                        'stub.gif': 'GIF89a',
                    },
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
                assert.equal(theLib.wwwRoot.willLoadTSV.callCount, 2);

                assert(! cb.called);
                assert(res.render.calledOnce);
                assert(res.send.calledOnce);

                // no caching
                assert.equal(Object.keys(willHandle.cache).length, 0);

                var context = res.render.firstCall.args[1];
                assert.equal(context.sample.stub, 'stub');
                assert.equal(context.sample.albumFile, 'stub');
                assert.equal(context.sample.albumAnchor, 'STUB');
                assert.equal(context.sample.coverImage, '/ambience/covergif/stub.gif');
                assert(context.sample.coverExists);
                assert.equal(context.quip.text, 'text');
            });
        });

        it('caches a response', function() {
            theLib.config.caching = true;

            return willHandle(req, res, cb)
            .then(function() {
                assert.equal(theLib.wwwRoot.willLoadTSV.callCount, 2);

                assert(! cb.called);
                assert(res.render.calledOnce);
                assert(res.send.calledOnce);

                assert.equal(Object.keys(willHandle.cache).length, 1);

                return willHandle(req, res, cb);
            })
            .then(function() {
                assert.equal(theLib.wwwRoot.willLoadTSV.callCount, 2);

                assert.equal(Object.keys(willHandle.cache).length, 1);
            });
        });
    });

    it('survives no data', function() {
        mockfs({ '/mock-fs': {
            'ambience': {
                'any.txt': NO_DATA,
                'anyquip.txt': NO_DATA,
            },
        } });

        return willHandle(req, res, cb)
        .then(function() {
            assert(cb.calledOnce);
            assert(! res.render.called);
            assert(! res.send.called);
        });
    });

    it('survives missing data', function() {
        mockfs({ '/mock-fs': {
            'ambience': { },
        } });

        return willHandle(req, res, cb)
        .then(function() {
            assert(cb.calledOnce);
            assert(! res.render.called);
            assert(! res.send.called);
        });
    });

    it('will fail gracefully', function() {
        mockfs({ '/mock-fs': {
            'ambience': {
                'any.txt': ANY_DATA,
                'anyquip.txt': QUIP_DATA,
            },
        } });

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
