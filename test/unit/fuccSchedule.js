'use strict';

const assert = require('assert');
const sinon = require('sinon');
const mockfs = require('mock-fs');
// TODO:  node-mocks-http@^1.5.2, once Request#render(cb)
const httpMocks = require('@cantremember/node-mocks-http');

const theLib = require('../../lib/index');
const theHelper = require('../helper');
const willHandle = require('../../app/fuccSchedule');

const NO_DATA = new Buffer(0);
const SHOW_HTML = `
before
<A NAME="anchor">
body1
body2
<!-- start -->
title
body3
<!-- end -->
<A NAME="different">
after
`;
const QUIP_DATA = `
text
text
`;


describe('fuccSchedule', () => {
    let sandbox;
    let cb;
    let req, res;
    let date;
    let SHOW_DATA;

    beforeEach(() => {
        // own own private sandbox
        sandbox = sinon.sandbox.create();
        cb = sandbox.spy();

        // mock Request & Response
        req = httpMocks.createRequest();
        res = httpMocks.createResponse();

        date = new Date();
        SHOW_DATA = `
file\tanchor\tdayOfWeek\thourStart\thourEnd
file\tanchor\t${ date.getDay() }\t${ date.getHours() }\t${ date.getHours() + 1 }
`;

        sandbox.spy(theLib.wwwRoot, 'willLoadTSV');
        sandbox.spy(theLib.wwwRoot, 'willLoadFile');
    });
    afterEach(() => {
        sandbox.restore();
        mockfs.restore();
    });


    it('knows when the station is dead', () => {
        mockfs({ '/mock-fs': {
            'fucc': {
                'dead.txt': 'DEAD',
                'showquip.txt': QUIP_DATA,
            }
        } });

        return willHandle(req, res, cb)
        .then(() => {
            assert.equal(theLib.wwwRoot.willLoadFile.callCount, 1);
            assert.equal(theLib.wwwRoot.willLoadTSV.callCount, 1);

            assert(! cb.called);
            assert.equal(res._getData(), 'fuccSchedule.ejs');
            assert.equal(res.statusCode, 200);

            const context = res._getRenderData();
            assert.equal(context.dead, 'DEAD');
            assert(! context.current);
            assert.equal(context.quip.text, 'text');
        });
    });

    it('knows when the station has a live event', () => {
        mockfs({ '/mock-fs': {
            'fucc': {
                'live.txt': `
file\tanchor\tyear\tmonth\tday\thourStart\thourEnd
file\tanchor\t${
    date.getYear() }\t${ date.getMonth() }\t${ date.getDate() }\t${
    date.getHours() }\t${ date.getHours() + 1
}
`,
                'live.html': `
before
<A NAME="anchor">
body1
body2
body3
<A NAME="different">
after
`,
                'showquip.txt': QUIP_DATA,
            }
        } });

        return willHandle(req, res, cb)
        .then(() => {
            assert.equal(theLib.wwwRoot.willLoadFile.callCount, 2);
            assert.equal(theLib.wwwRoot.willLoadTSV.callCount, 2);

            assert(! cb.called);
            assert.equal(res._getData(), 'fuccSchedule.ejs');

            const context = res._getRenderData();
            assert(! context.dead);
            assert.equal(context.current.type, 'live');
            assert.equal(context.current.anchor, 'anchor');
            assert.equal(context.current.year, date.getFullYear());
            assert.equal(context.current.body, 'body1\nbody2\nbody3');
            assert.strictEqual(context.current.title, undefined);
            assert.equal(context.quip.text, 'text');
        });
    });

    it('knows when the station has a show', () => {
        mockfs({ '/mock-fs': {
            'fucc': {
                // not live
                'live.txt': `
file\tanchor\tyear\tmonth\tday\thourStart\thourEnd
file\tanchor\t1970\t0\t1\t0\t0
`,
                'live.html': NO_DATA,
                'show.txt': SHOW_DATA,
                'show.html': SHOW_HTML,
                'showquip.txt': QUIP_DATA,
            }
        } });

        return willHandle(req, res, cb)
        .then(() => {
            assert.equal(theLib.wwwRoot.willLoadFile.callCount, 3);
            assert.equal(theLib.wwwRoot.willLoadTSV.callCount, 3);

            assert(! cb.called);
            assert.equal(res._getData(), 'fuccSchedule.ejs');

            const context = res._getRenderData();
            assert(! context.dead);
            assert.equal(context.current.type, 'show');
            assert.equal(context.current.anchor, 'anchor');
            assert.equal(context.current.dayOfWeek, date.getDay());
            assert.equal(context.current.body, 'body1\nbody2\nbody3');
            assert.equal(context.current.title, 'title');
            assert.equal(context.quip.text, 'text');
        });
    });

    it('knows when it is being told nothing useful', () => {
        mockfs({ '/mock-fs': {
            'fucc': {
                'live.txt': NO_DATA,
                'live.html': NO_DATA,
                // no show
                'show.txt': `
file\tanchor\tdayOfWeek\thourStart\thourEnd
file\tanchor\t0\t0\t0
`,
                'show.html': NO_DATA,
                'showquip.txt': QUIP_DATA,
            }
        } });

        return willHandle(req, res, cb)
        .then(() => {
            assert.equal(theLib.wwwRoot.willLoadFile.callCount, 3);
            assert.equal(theLib.wwwRoot.willLoadTSV.callCount, 3);

            assert(! cb.called);
            assert.equal(res._getData(), 'fuccSchedule.ejs');

            const context = res._getRenderData();
            assert(! context.dead);
            assert(! context.current);
            assert.equal(context.quip.text, 'text');
        });
    });

    it('survives missing quips', () => {
        mockfs({ '/mock-fs': {
            'fucc': {
                'show.txt': SHOW_DATA,
                'show.html': SHOW_HTML,
            }
        } });

        return willHandle(req, res, cb)
        .then(() => {
            assert(! cb.called);
            assert.equal(res._getData(), 'fuccSchedule.ejs');

            const context = res._getRenderData();
            assert.strictEqual(context.quip.text, undefined);
        });
    });

    it('survives missing everything EXCEPT quips', () => {
        mockfs({ '/mock-fs': {
            'fucc': {
                'showquip.txt': QUIP_DATA,
            }
        } });

        return willHandle(req, res, cb)
        .then(() => {
            assert(! cb.called);
            assert.equal(res._getData(), 'fuccSchedule.ejs');

            const context = res._getRenderData();
            assert(! context.dead);
            assert(! context.current);
        });
    });

    it('will fail gracefully', () => {
        mockfs({ '/mock-fs': {
            'fucc': {
                'show.txt': SHOW_DATA,
                'show.html': SHOW_HTML,
            }
        } });

        sandbox.stub(res, 'render').throws(new Error('BOOM'));
        sandbox.spy(res, 'send');

        return willHandle(req, res, cb)
        .then(theHelper.notCalled, (err) => {
            assert.equal(err.message, 'BOOM');

            assert(res.render.calledOnce);
            assert(! res.send.called);

            // Express gets informed
            assert(cb.called);
            assert.strictEqual(cb.args[0][0], err);
        });
    });
});
