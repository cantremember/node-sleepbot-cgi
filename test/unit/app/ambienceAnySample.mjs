import assert from 'assert';
import sinon from 'sinon';
import mockfs from 'mock-fs';
import httpMocks from 'node-mocks-http';

import theLib from '../../../lib/index.mjs';
import theHelper from '../../helper.mjs';
import {
  default as middleware,
  willLoadSamples,
  willLoadQuips,
} from '../../../app/ambienceAnySample.mjs';

const NO_DATA = Buffer.alloc(0);
// its first line is a count of rows
const ANY_DATA = `2
file\text\tpage\tstub\tartist\talbum\ttrack\tsize
file\text\tpage\tstub\tartist\talbum\ttrack\tsize
`;
// it's just data
const QUIP_DATA = `text
text
`;


describe('ambienceAnySample', () => {
  const sandbox = sinon.createSandbox();
  let next;
  let req;
  let res;

  beforeEach(() => {
    next = sandbox.spy();

    // mock Request & Response
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
  });
  afterEach(() => {
    sandbox.restore();
    mockfs.restore();
    theHelper.mockConfig();

    theLib.forget();
    middleware.forget();
  });


  describe('willLoadSamples', () => {
    it('loads representative data', async () => {
      mockfs({ '/mock-fs': {
        'ambience': {
          'any.txt': ANY_DATA,
        },
      } });

      const samples = await willLoadSamples();
      assert.deepEqual(samples, [
        {
          file: 'file',
          ext: 'ext',
          page: 'page',
          stub: 'stub',
          artist: 'artist',
          album: 'album',
          track: 'track',
          size: 'size',
        },
        {
          file: 'file',
          ext: 'ext',
          page: 'page',
          stub: 'stub',
          artist: 'artist',
          album: 'album',
          track: 'track',
          size: 'size',
        },
      ]);
    });
  });


  describe('willLoadQuips', () => {
    it('loads representative data', async () => {
      mockfs({ '/mock-fs': {
        'ambience': {
          'anyquip.txt': QUIP_DATA,
        },
      } });

      const quips = await willLoadQuips();
      assert.deepEqual(quips, [
        { text: 'text' },
        { text: 'text' },
      ]);
    });
  });


  describe('with a sample and quip', () => {
    beforeEach(() => {
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

    it('produces a response', async () => {
      assert(! theLib.config.get('caching'));

      // it resolves the Response
      const returned = await middleware(req, res, next);
      assert.equal(returned, res);

      assert(! next.called);
      assert.equal(res._getData(), 'ambienceAnySample.ejs');
      assert.equal(res.statusCode, 200);

      // no caching
      assert.equal(Object.keys(middleware.cache).length, 0);

      const context = res._getRenderData();

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

    it('caches a response', async () => {
      theHelper.mockConfig({ caching: true });

      // un-cached
      await middleware(req, res, next);

      assert(! next.called);
      assert.equal(res._getData(), 'ambienceAnySample.ejs');

      assert.equal(Object.keys(middleware.cache).length, 1);

      // and again, cached
      res = httpMocks.createResponse();
      await middleware(req, res, next);

      assert(! next.called);
      assert.equal(res._getData(), 'ambienceAnySample.ejs');

      assert.equal(Object.keys(middleware.cache).length, 1);
    });
  });

  it('produces a response with a high-order file having no cover image', async () => {
    mockfs({ '/mock-fs': {
      'ambience': {
        'any.txt': `
FILE\tEXT\tPAGE\tSTUB\tARTIST\tALBUM\tTRACK\tSIZE
zzzz\text\tpage\tstub\tartist\talbum\ttrack\tsize
`,
        'anyquip.txt': NO_DATA,
      },
    } });

    await middleware(req, res, next);

    assert(! next.called);
    assert.equal(res._getData(), 'ambienceAnySample.ejs');
    assert.equal(res.statusCode, 200);

    // no caching
    assert.equal(Object.keys(middleware.cache).length, 0);

    const context = res._getRenderData();

    assert.equal(context.sample.file, 'zzzz');

    assert.equal(context.sample.dirNum, 2);
    assert(! context.sample.coverExists);
  });

  it('survives no data', async () => {
    mockfs({ '/mock-fs': {
      'ambience': {
        'any.txt': NO_DATA,
        'anyquip.txt': NO_DATA,
      },
    } });

    sandbox.spy(res, 'render');
    sandbox.spy(res, 'send');

    await middleware(req, res, next);

    assert(next.calledOnce);
    assert(! res.render.called);
    assert(! res.send.called);
  });

  it('fails on missing data', async () => {
    mockfs({ '/mock-fs': {
      'ambience': { },
    } });

    sandbox.spy(res, 'render');
    sandbox.spy(res, 'send');

    await middleware(req, res, next);

    const err = next.args[0][0];
    assert(err.message.match(/ENOENT/));

    // it('will fail gracefully')
  });

  it('will fail gracefully', async () => {
    mockfs({ '/mock-fs': {
      'ambience': {
        'any.txt': ANY_DATA,
        'anyquip.txt': QUIP_DATA,
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
