import assert from 'assert';
import sinon from 'sinon';
import mockfs from 'mock-fs';
import httpMocks from 'node-mocks-http';

import wwwRoot from '../../lib/wwwRoot';
import theLib from '../../lib/index';
import theHelper from '../helper';
import willHandle from '../../app/lookitAnyStory';


describe('lookitAnyStory', () => {
  const sandbox = sinon.createSandbox();
  let cb;
  let req;
  let res;

  beforeEach(() => {
    cb = sandbox.spy();

    // mock Request & Response
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();

    sandbox.spy(wwwRoot, 'willLoadFile');
  });
  afterEach(() => {
    sandbox.restore();
    mockfs.restore();
    theHelper.mockConfig();

    theLib.forget();
    willHandle.forget();
  });


  describe('with a random file', () => {
    beforeEach(() => {
      theHelper.mockGlob(sandbox, () => {
        return [ 'glob.file' ];
      });

      mockfs({ '/mock-fs': {
        'lookit': {
          'story': {
            'glob.file': 'GLOB.FILE',
          }
        },
      } });
    });

    it('produces a response', () => {
      assert(! theLib.config.get('caching'));

      return willHandle(req, res, cb)
      .then(() => {
        assert.equal(wwwRoot.willLoadFile.callCount, 1);

        assert(! cb.called);
        assert.equal(res._getData(), 'lookitAnyStory.ejs');
        assert.equal(res.statusCode, 200);

        // no caching
        assert.equal(Object.keys(willHandle.cache).length, 0);

        const context = res._getRenderData();
        assert.equal(context.body, 'GLOB.FILE');
      });
    });

    it('caches a response', () => {
      theHelper.mockConfig({ caching: true });

      return willHandle(req, res, cb)
      .then(() => {
        assert.equal(wwwRoot.willLoadFile.callCount, 1);

        assert(! cb.called);
        assert.equal(res._getData(), 'lookitAnyStory.ejs');

        assert.equal(Object.keys(willHandle.cache).length, 1);

        // and again
        res = httpMocks.createResponse();
        return willHandle(req, res);
      })
      .then(() => {
        assert.equal(wwwRoot.willLoadFile.callCount, 1);

        assert(! cb.called);
        assert.equal(res._getData(), 'lookitAnyStory.ejs');

        assert.equal(Object.keys(willHandle.cache).length, 1);
      });
    });
  });

  it('survives with no file contents', () => {
    theHelper.mockGlob(sandbox, () => {
      return [ 'glob.file' ];
    });

    return willHandle(req, res, cb)
    .then(() => {
      assert(! cb.called);
      assert.equal(res._getData(), 'lookitAnyStory.ejs');

      const context = res._getRenderData();
      assert.strictEqual(context.body, '');
    });
  });

  it('will fail gracefully', () => {
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
