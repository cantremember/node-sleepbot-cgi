import assert from 'assert';
import sinon from 'sinon';
import mockfs from 'mock-fs';
import httpMocks from 'node-mocks-http';

import wwwRoot from '../../../lib/wwwRoot';
import theLib from '../../../lib/index';
import theHelper from '../../helper';
import willHandle from '../../../app/ambienceAnySample';

const NO_DATA = Buffer.alloc(0);
const ANY_DATA = `
file\text\tpage\tstub\tartist\talbum\ttrack\tsize
file\text\tpage\tstub\tartist\talbum\ttrack\tsize
`;
const QUIP_DATA = `
text
text
`;


describe('ambienceAnySample', () => {
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
    theHelper.mockConfig();

    theLib.forget();
    willHandle.forget();
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

    it('produces a response', () => {
      assert(! theLib.config.get('caching'));

      return willHandle(req, res, cb)
      .then((_res) => {
        // it resolves the Response
        assert.equal(_res, res);

        assert.equal(wwwRoot.willLoadTSV.callCount, 2);

        assert(! cb.called);
        assert.equal(res._getData(), 'ambienceAnySample.ejs');
        assert.equal(res.statusCode, 200);

        // no caching
        assert.equal(Object.keys(willHandle.cache).length, 0);

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
    });

    it('caches a response', () => {
      theHelper.mockConfig({ caching: true });

      return willHandle(req, res, cb)
      .then(() => {
        assert.equal(wwwRoot.willLoadTSV.callCount, 2);

        assert(! cb.called);
        assert.equal(res._getData(), 'ambienceAnySample.ejs');

        assert.equal(Object.keys(willHandle.cache).length, 1);

        // and again
        res = httpMocks.createResponse();
        return willHandle(req, res, cb);
      })
      .then((_res) => {
        // it resolves the Response
        assert.equal(_res, res);

        assert.equal(wwwRoot.willLoadTSV.callCount, 2);

        assert(! cb.called);
        assert.equal(res._getData(), 'ambienceAnySample.ejs');

        assert.equal(Object.keys(willHandle.cache).length, 1);
      });
    });
  });

  it('produces a response with a high-order file having no cover image', () => {
    mockfs({ '/mock-fs': {
      'ambience': {
        'any.txt': `
FILE\tEXT\tPAGE\tSTUB\tARTIST\tALBUM\tTRACK\tSIZE
zzzz\text\tpage\tstub\tartist\talbum\ttrack\tsize
`,
        'anyquip.txt': NO_DATA,
      },
    } });

    return willHandle(req, res, cb)
    .then(() => {
      assert.equal(wwwRoot.willLoadTSV.callCount, 2);

      assert(! cb.called);
      assert.equal(res._getData(), 'ambienceAnySample.ejs');
      assert.equal(res.statusCode, 200);

      // no caching
      assert.equal(Object.keys(willHandle.cache).length, 0);

      const context = res._getRenderData();

      assert.equal(context.sample.file, 'zzzz');

      assert.equal(context.sample.dirNum, 2);
      assert(! context.sample.coverExists);
    });
  });

  it('survives no data', () => {
    mockfs({ '/mock-fs': {
      'ambience': {
        'any.txt': NO_DATA,
        'anyquip.txt': NO_DATA,
      },
    } });

    sandbox.spy(res, 'render');
    sandbox.spy(res, 'send');

    return willHandle(req, res, cb)
    .then(() => {
      assert(cb.calledOnce);
      assert(! res.render.called);
      assert(! res.send.called);
    });
  });

  it('fails on missing data', () => {
    mockfs({ '/mock-fs': {
      'ambience': { },
    } });

    sandbox.spy(res, 'render');
    sandbox.spy(res, 'send');

    return willHandle(req, res, cb)
    .then(() => {
      const err = cb.args[0][0];
      assert(err.message.match(/ENOENT/));

      // it('will fail gracefully')
    });
  });

  it('will fail gracefully', () => {
    mockfs({ '/mock-fs': {
      'ambience': {
        'any.txt': ANY_DATA,
        'anyquip.txt': QUIP_DATA,
      },
    } });

    sandbox.stub(res, 'render').throws(new Error('BOOM'));
    sandbox.spy(res, 'send');

    return willHandle(req, res, cb)
    .then((_res) => {
      // it resolves the Response
      assert.equal(_res, res);

      assert(res.render.calledOnce);
      assert(! res.send.called);

      // Express gets informed
      assert(cb.called);

      const err = cb.args[0][0];
      assert.equal(err.message, 'BOOM');
    });
  });
});
