import assert from 'assert';
import sinon from 'sinon';
import mockfs from 'mock-fs';
import httpMocks from 'node-mocks-http';

import theLib from '../../../lib/index.mjs';
import wwwRoot from '../../../lib/wwwRoot.mjs';
import {
  default as middleware,
  willLoadCards,
} from '../../../app/morganLayout.mjs';

const CARD_DATA = `ID\tABBREV\tTITLE
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
  const sandbox = sinon.createSandbox();
  let next;
  let req;
  let res;

  beforeEach(() => {
    next = sandbox.spy();

    // mock Request & Response
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();

    sandbox.spy(wwwRoot, 'willLoadTSV');
  });
  afterEach(() => {
    theLib.forget();

    sandbox.restore();
    mockfs.restore();
  });


  describe('willLoadCards', () => {
    it('loads representative data', async () => {
      mockfs({ '/mock-fs': {
        'morgan': {
          'card.txt': CARD_DATA,
        },
      } });

      const cards = await willLoadCards();
      assert.equal(cards.length, 10);
      assert.deepEqual(cards[0], {
        id: '1',
        abbrev: 'one',
        title: 'ONE',
      });
    });
  });


  it('displays three cards by default', async () => {
    mockfs({ '/mock-fs': {
      'morgan': {
        'card.txt': CARD_DATA,
      },
    } });

    // it resolves the Response
    const returned = await middleware(req, res, next);
    assert.equal(returned, res);

    assert.equal(wwwRoot.willLoadTSV.callCount, 1);

    assert(! next.called);
    assert.equal(res._getData(), 'morganLayout.ejs');
    assert.equal(res.statusCode, 200);

    const context = res._getRenderData();
    assert.equal(context.cards.length, 3);
    assert(context.quip.text);
  });

  it('displays at least 1 card', async () => {
    mockfs({ '/mock-fs': {
      'morgan': {
        'card.txt': CARD_DATA,
      },
    } });

    req = httpMocks.createRequest({
      query: { cards: 0 }
    });

    await middleware(req, res, next);

    assert(! next.called);
    assert.equal(res._getData(), 'morganLayout.ejs');

    const context = res._getRenderData();
    assert.equal(context.cards.length, 1);
  });

  it('displays at most 10 cards', async () => {
    mockfs({ '/mock-fs': {
      'morgan': {
        'card.txt': CARD_DATA,
      },
    } });

    req = httpMocks.createRequest({
      query: { cards: 99 }
    });

    await middleware(req, res, next);

    assert(! next.called);
    assert.equal(res._getData(), 'morganLayout.ejs');

    const context = res._getRenderData();
    assert.equal(context.cards.length, 10);
  });

  it('will not display more cards that it has', async () => {
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

    await middleware(req, res, next);

    assert(! next.called);
    assert.equal(res._getData(), 'morganLayout.ejs');

    const context = res._getRenderData();
    assert.equal(context.cards.length, 3);
  });

  it('fails on missing cards', async () => {
    mockfs({ '/mock-fs': {
      'morgan': { }
    } });

    await middleware(req, res, next);

    const err = next.args[0][0];
    assert(err.message.match(/ENOENT/));

    // it('will fail gracefully')
  });

  it('will fail gracefully', async () => {
    mockfs({ '/mock-fs': {
      'morgan': {
        'card.txt': CARD_DATA,
      },
    } });

    sandbox.stub(res, 'render').throws(new Error('BOOM'));
    sandbox.spy(res, 'send');

    // it resolves the Response
    const returned = await middleware(req, res, next);
    assert.equal(returned, res);

    assert(res.render.calledOnce);
    assert(! res.send.called);

    // Express gets informed
    assert(next.called);

    const err = next.args[0][0];
    assert.equal(err.message, 'BOOM');
  });
});
