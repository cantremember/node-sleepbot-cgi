'use strict';

var assert = require('assert');
var sinon = require('sinon');
var mockfs = require('mock-fs');
var httpMocks = require('node-mocks-http');

var theLib = require('../../lib/index');
var theHelper = require('../helper');
var willHandle = require('../../app/morganLayout');

var CARD_DATA = '\
id\tabbrev\ttitle\n\
1\tone\tONE\n\
2\ttwo\tTWO\n\
3\tthree\tTHREE\n\
4\tfour\tFOUR\n\
5\tfive\tFIVE\n\
6\tsix\tSIX\n\
7\tseven\tSEVEN\n\
8\teight\tEIGHT\n\
9\tnine\tNINE\n\
10\tten\tTEN\n\
';


describe('morganLayout', function() {
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
    });


    it('displays three cards by default', function() {
        mockfs({ '/mock-fs': {
            'morgan': {
                'card.txt': CARD_DATA,
            },
        } });

        return willHandle(req, res, cb)
        .then(function() {
            assert.equal(theLib.wwwRoot.willLoadTSV.callCount, 1);

            assert(! cb.called);
            assert.equal(res._getData(), 'morganLayout.ejs');
            assert.equal(res.statusCode, 200);

            var context = res._getRenderData();
            assert.equal(context.cards.length, 3);
            assert(context.quip.text);
        });
    });

    it('displays at least 1 card', function() {
        mockfs({ '/mock-fs': {
            'morgan': {
                'card.txt': CARD_DATA,
            },
        } });

        req._setParameter('cards', 0);

        return willHandle(req, res, cb)
        .then(function() {
            assert(! cb.called);
            assert.equal(res._getData(), 'morganLayout.ejs');

            var context = res._getRenderData();
            assert.equal(context.cards.length, 1);
        });
    });

    it('displays at most 10 cards', function() {
        mockfs({ '/mock-fs': {
            'morgan': {
                'card.txt': CARD_DATA,
            },
        } });

        req._setParameter('cards', 99);

        return willHandle(req, res, cb)
        .then(function() {
            assert(! cb.called);
            assert.equal(res._getData(), 'morganLayout.ejs');

            var context = res._getRenderData();
            assert.equal(context.cards.length, 10);
        });
    });

    it('will not display more cards that it has', function() {
        mockfs({ '/mock-fs': {
            'morgan': {
                'card.txt': '\
id\tabbrev\ttitle\n\
1\tone\tONE\n\
2\ttwo\tTWO\n\
3\tthree\tTHREE\n\
',
            },
        } });

        req._setParameter('cards', 99);

        return willHandle(req, res, cb)
        .then(function() {
            assert(! cb.called);
            assert.equal(res._getData(), 'morganLayout.ejs');

            var context = res._getRenderData();
            assert.equal(context.cards.length, 3);
        });
    });

    it('survives missing cards', function() {
        mockfs({ '/mock-fs': {
            'morgan': { }
        } });

        return willHandle(req, res, cb)
        .then(function() {
            assert(! cb.called);
            assert.equal(res._getData(), 'morganLayout.ejs');

            var context = res._getRenderData();
            assert.equal(context.cards.length, 0);
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
