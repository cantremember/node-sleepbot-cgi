'use strict';

var assert = require('assert');
var sinon = require('sinon');
var mockfs = require('mock-fs');
var httpMocks = require('@cantremember/node-mocks-http');

var theLib = require('../../lib/index');
var theHelper = require('../helper');
var willHandle = require('../../app/fuccSchedule');

var NO_DATA = new Buffer(0);
var SHOW_DATA; // must be 'fresh'
var SHOW_HTML = '\
before\n\
<A NAME="anchor">\n\
body1\n\
body2\n\
<!-- start -->\n\
title\n\
body3\n\
<!-- end -->\n\
<A NAME="different">\n\
after\n\
';
var QUIP_DATA = '\
text\n\
text\n\
';


describe('fuccSchedule', function() {
    var sandbox;
    var cb;
    var req, res;
    var date;
    beforeEach(function() {
        // own own private sandbox
        sandbox = sinon.sandbox.create();
        cb = sandbox.spy();

        // mock Request & Response
        req = httpMocks.createRequest();
        res = httpMocks.createResponse();

        date = new Date();
        SHOW_DATA = '\
file\tanchor\tyear\tmonth\tday\thourStart\thourEnd\n\
file\tanchor\t' +
    date.getDay() + '\t' + date.getHours() + '\t' + (date.getHours() + 1) + '\n\
';

        sandbox.spy(theLib.wwwRoot, 'willLoadTSV');
        sandbox.spy(theLib.wwwRoot, 'willLoadFile');
    });
    afterEach(function() {
        sandbox.restore();
        mockfs.restore();
    });


    it('knows when the station is dead', function() {
        mockfs({ '/mock-fs': {
            'fucc': {
                'dead.txt': 'DEAD',
                'showquip.txt': QUIP_DATA,
            }
        } });

        return willHandle(req, res, cb)
        .then(function() {
            assert.equal(theLib.wwwRoot.willLoadFile.callCount, 1);
            assert.equal(theLib.wwwRoot.willLoadTSV.callCount, 1);

            assert(! cb.called);
            assert.equal(res._getData(), 'fuccSchedule.ejs');
            assert.equal(res.statusCode, 200);

            var context = res._getRenderData();
            assert.equal(context.dead, 'DEAD');
            assert(! context.current);
            assert.equal(context.quip.text, 'text');
        });
    });

    it('knows when the station has a live event', function() {
        mockfs({ '/mock-fs': {
            'fucc': {
                'live.txt': '\
file\tanchor\tyear\tmonth\tday\thourStart\thourEnd\n\
file\tanchor\t' +
    date.getYear() + '\t' + date.getMonth() + '\t' + date.getDate() + '\t' +
    date.getHours() + '\t' + (date.getHours() + 1) + '\n\
',
                'live.html': '\
before\n\
<A NAME="anchor">\n\
body1\n\
body2\n\
body3\n\
<A NAME="different">\n\
after\n\
',
                'showquip.txt': QUIP_DATA,
            }
        } });

        return willHandle(req, res, cb)
        .then(function() {
            assert.equal(theLib.wwwRoot.willLoadFile.callCount, 2);
            assert.equal(theLib.wwwRoot.willLoadTSV.callCount, 2);

            assert(! cb.called);
            assert.equal(res._getData(), 'fuccSchedule.ejs');

            var context = res._getRenderData();
            assert(! context.dead);
            assert.equal(context.current.type, 'live');
            assert.equal(context.current.anchor, 'anchor');
            assert.equal(context.current.year, date.getFullYear());
            assert.equal(context.current.body, 'body1\nbody2\nbody3');
            assert.strictEqual(context.current.title, undefined);
            assert.equal(context.quip.text, 'text');
        });
    });

    it('knows when the station has a show', function() {
        mockfs({ '/mock-fs': {
            'fucc': {
                // not live
                'live.txt': '\
file\tanchor\tyear\tmonth\tday\thourStart\thourEnd\n\
file\tanchor\t1970\t0\t1\t0\t0\n\
',
                'live.html': NO_DATA,
                'show.txt': SHOW_DATA,
                'show.html': SHOW_HTML,
                'showquip.txt': QUIP_DATA,
            }
        } });

        return willHandle(req, res, cb)
        .then(function() {
            assert.equal(theLib.wwwRoot.willLoadFile.callCount, 3);
            assert.equal(theLib.wwwRoot.willLoadTSV.callCount, 3);

            assert(! cb.called);
            assert.equal(res._getData(), 'fuccSchedule.ejs');

            var context = res._getRenderData();
            assert(! context.dead);
            assert.equal(context.current.type, 'show');
            assert.equal(context.current.anchor, 'anchor');
            assert.equal(context.current.dayOfWeek, date.getDay());
            assert.equal(context.current.body, 'body1\nbody2\nbody3');
            assert.equal(context.current.title, 'title');
            assert.equal(context.quip.text, 'text');
        });
    });

    it('knows when it is being told nothing useful', function() {
        mockfs({ '/mock-fs': {
            'fucc': {
                'live.txt': NO_DATA,
                'live.html': NO_DATA,
                // no show
                'show.txt': '\
file\tanchor\tyear\tmonth\tday\thourStart\thourEnd\n\
file\tanchor\t1970\t0\t1\t0\t0\n\
',
                'show.html': NO_DATA,
                'showquip.txt': QUIP_DATA,
            }
        } });

        return willHandle(req, res, cb)
        .then(function() {
            assert.equal(theLib.wwwRoot.willLoadFile.callCount, 3);
            assert.equal(theLib.wwwRoot.willLoadTSV.callCount, 3);

            assert(! cb.called);
            assert.equal(res._getData(), 'fuccSchedule.ejs');

            var context = res._getRenderData();
            assert(! context.dead);
            assert(! context.current);
            assert.equal(context.quip.text, 'text');
        });
    });

    it('survives missing quips', function() {
        mockfs({ '/mock-fs': {
            'fucc': {
                'show.txt': SHOW_DATA,
                'show.html': SHOW_HTML,
            }
        } });

        return willHandle(req, res, cb)
        .then(function() {
            assert(! cb.called);
            assert.equal(res._getData(), 'fuccSchedule.ejs');

            var context = res._getRenderData();
            assert.strictEqual(context.quip.text, undefined);
        });
    });

    it('survives missing everything EXCEPT quips', function() {
        mockfs({ '/mock-fs': {
            'fucc': {
                'showquip.txt': QUIP_DATA,
            }
        } });

        return willHandle(req, res, cb)
        .then(function() {
            assert(! cb.called);
            assert.equal(res._getData(), 'fuccSchedule.ejs');

            var context = res._getRenderData();
            assert(! context.dead);
            assert(! context.current);
        });
    });

    it('will fail gracefully', function() {
        mockfs({ '/mock-fs': {
            'fucc': {
                'show.txt': SHOW_DATA,
                'show.html': SHOW_HTML,
            }
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
