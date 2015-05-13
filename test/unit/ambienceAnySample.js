'use strict';

var assert = require('assert');
var sinon = require('sinon');
var mockfs = require('mock-fs');
var httpMocks = require('node-mocks-http');

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
        req = httpMocks.createRequest(sandbox);
        res = httpMocks.createResponse(sandbox);

        sandbox.spy(theLib.wwwRoot, 'willLoadTSV');
    });
    afterEach(function() {
        sandbox.restore();
        mockfs.restore();
        theHelper.mockConfig();

        theLib.forget();
        willHandle.forget();
    });


    describe('with a sample and quip', function() {
        beforeEach(function() {
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

        it('produces a response', function() {
            assert(! theLib.config.get('caching'));

            return willHandle(req, res, cb)
            .then(function() {
                assert.equal(theLib.wwwRoot.willLoadTSV.callCount, 2);

                assert(! cb.called);
                assert.equal(res._getData(), 'ambienceAnySample.ejs');
                assert.equal(res.statusCode, 200);

                // no caching
                assert.equal(Object.keys(willHandle.cache).length, 0);

                var context = res._getRenderData();

                assert.equal(context.sample.file, 'file');
                assert.equal(context.sample.ext, 'ext');
                assert.equal(context.sample.page, 'page');
                assert.equal(context.sample.stub, 'stub');
                assert.equal(context.sample.artist, 'artist');
                assert.equal(context.sample.track, 'track');
                assert.equal(context.sample.size, 'size');

                assert.equal(context.sample.albumFile, 'stub');
                assert.equal(context.sample.albumAnchor, 'STUB');
                assert.equal(context.sample.dirNum, 1);
                assert.equal(context.sample.coverImage, '/ambience/covergif/stub.gif');
                assert(context.sample.coverExists);

                assert.equal(context.quip.text, 'text');
            });
        });

        it('caches a response', function() {
            theHelper.mockConfig({ caching: true });

            return willHandle(req, res, cb)
            .then(function() {
                assert.equal(theLib.wwwRoot.willLoadTSV.callCount, 2);

                assert(! cb.called);
                assert.equal(res._getData(), 'ambienceAnySample.ejs');

                assert.equal(Object.keys(willHandle.cache).length, 1);

                // and again
                res = httpMocks.createResponse(sandbox);
                return willHandle(req, res, cb);
            })
            .then(function() {
                assert.equal(theLib.wwwRoot.willLoadTSV.callCount, 2);

                assert(! cb.called);
                assert.equal(res._getData(), 'ambienceAnySample.ejs');

                assert.equal(Object.keys(willHandle.cache).length, 1);
            });
        });
    });

    it('produces a response with a high-order file having no cover image', function() {
        mockfs({ '/mock-fs': {
            'ambience': {
                'any.txt': '\n\
file\text\tpage\tstub\tartist\talbum\ttrack\tsize\n\
zzzz\text\tpage\tstub\tartist\talbum\ttrack\tsize\n\
',
                'anyquip.txt': NO_DATA,
            },
        } });

        return willHandle(req, res, cb)
        .then(function() {
            assert.equal(theLib.wwwRoot.willLoadTSV.callCount, 2);

            assert(! cb.called);
            assert.equal(res._getData(), 'ambienceAnySample.ejs');
            assert.equal(res.statusCode, 200);

            // no caching
            assert.equal(Object.keys(willHandle.cache).length, 0);

            var context = res._getRenderData();

            assert.equal(context.sample.file, 'zzzz');

            assert.equal(context.sample.dirNum, 2);
            assert(! context.sample.coverExists);
        });
    });

    it('survives no data', function() {
        mockfs({ '/mock-fs': {
            'ambience': {
                'any.txt': NO_DATA,
                'anyquip.txt': NO_DATA,
            },
        } });

        sandbox.spy(res, 'render');
        sandbox.spy(res, 'send');

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

        sandbox.spy(res, 'render');
        sandbox.spy(res, 'send');

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
