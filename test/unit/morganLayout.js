const assert = require('assert');
const sinon = require('sinon');
const mockfs = require('mock-fs');
// TODO:  node-mocks-http@^1.5.2, once Request#render(cb)
const httpMocks = require('@cantremember/node-mocks-http');

const theLib = require('../../lib/index');
const theHelper = require('../helper');
const willHandle = require('../../app/morganLayout');

const CARD_DATA = `
id\tabbrev\ttitle
1\tone\tONE
2\ttwo\tTWO
3\tthree\tTHREE
4\tfour\tFOUR
5\tfive\tFIVE
6\tsix\tSIX
7\tseven\tSEVEN
8\teight\tEIGHT
9\tnine\tNINE
10\tten\tTEN
`;


describe('morganLayout', () => {
    let sandbox;
    let cb;
    let req;
    let res;

    beforeEach(() => {
        // own own private sandbox
        sandbox = sinon.sandbox.create();
        cb = sandbox.spy();

        // mock Request & Response
        req = httpMocks.createRequest();
        res = httpMocks.createResponse();

        sandbox.spy(theLib.wwwRoot, 'willLoadTSV');
    });
    afterEach(() => {
        sandbox.restore();
        mockfs.restore();
    });


    it('displays three cards by default', () => {
        mockfs({ '/mock-fs': {
            'morgan': {
                'card.txt': CARD_DATA,
            },
        } });

        return willHandle(req, res, cb)
        .then(() => {
            assert.equal(theLib.wwwRoot.willLoadTSV.callCount, 1);

            assert(! cb.called);
            assert.equal(res._getData(), 'morganLayout.ejs');
            assert.equal(res.statusCode, 200);

            const context = res._getRenderData();
            assert.equal(context.cards.length, 3);
            assert(context.quip.text);
        });
    });

    it('displays at least 1 card', () => {
        mockfs({ '/mock-fs': {
            'morgan': {
                'card.txt': CARD_DATA,
            },
        } });

        req = httpMocks.createRequest({
            query: { cards: 0 }
        });

        return willHandle(req, res, cb)
        .then(() => {
            assert(! cb.called);
            assert.equal(res._getData(), 'morganLayout.ejs');

            const context = res._getRenderData();
            assert.equal(context.cards.length, 1);
        });
    });

    it('displays at most 10 cards', () => {
        mockfs({ '/mock-fs': {
            'morgan': {
                'card.txt': CARD_DATA,
            },
        } });

        req = httpMocks.createRequest({
            query: { cards: 99 }
        });

        return willHandle(req, res, cb)
        .then(() => {
            assert(! cb.called);
            assert.equal(res._getData(), 'morganLayout.ejs');

            const context = res._getRenderData();
            assert.equal(context.cards.length, 10);
        });
    });

    it('will not display more cards that it has', () => {
        mockfs({ '/mock-fs': {
            'morgan': {
                'card.txt': `
id\tabbrev\ttitle
1\tone\tONE
2\ttwo\tTWO
3\tthree\tTHREE
`,
            },
        } });

        req = httpMocks.createRequest({
            query: { cards: 99 }
        });

        return willHandle(req, res, cb)
        .then(() => {
            assert(! cb.called);
            assert.equal(res._getData(), 'morganLayout.ejs');

            const context = res._getRenderData();
            assert.equal(context.cards.length, 3);
        });
    });

    it('survives missing cards', () => {
        mockfs({ '/mock-fs': {
            'morgan': { }
        } });

        return willHandle(req, res, cb)
        .then(() => {
            assert(! cb.called);
            assert.equal(res._getData(), 'morganLayout.ejs');

            const context = res._getRenderData();
            assert.equal(context.cards.length, 0);
        });
    });

    it('will fail gracefully', () => {
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
