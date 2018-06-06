import assert from 'assert';
import sinon from 'sinon';
import mockfs from 'mock-fs';
import httpMocks from 'node-mocks-http';

import wwwRoot from '../../../lib/wwwRoot';
import willHandle from '../../../app/morganLayout';

const CARD_DATA = `
ID\tABBREV\tTITLE
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
  let cb;
  let req;
  let res;

  beforeEach(() => {
    cb = sandbox.spy();

    // mock Request & Response
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();

    sandbox.spy(wwwRoot, 'willLoadTSV');
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
      assert.equal(wwwRoot.willLoadTSV.callCount, 1);

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

  it('fails on missing cards', () => {
    mockfs({ '/mock-fs': {
      'morgan': { }
    } });

    return willHandle(req, res, cb)
    .then(() => {
      const err = cb.args[0][0];
      assert(err.message.match(/ENOENT/));

      // it('will fail gracefully')
    });
  });

  it('will fail gracefully', () => {
    mockfs({ '/mock-fs': {
      'morgan': {
        'card.txt': CARD_DATA,
      },
    } });

    sandbox.stub(res, 'render').throws(new Error('BOOM'));
    sandbox.spy(res, 'send');

    return willHandle(req, res, cb)
    .then(() => {
      assert(res.render.calledOnce);
      assert(! res.send.called);

      // Express gets informed
      assert(cb.called);

      const err = cb.args[0][0];
      assert.equal(err.message, 'BOOM');
    });
  });
});
