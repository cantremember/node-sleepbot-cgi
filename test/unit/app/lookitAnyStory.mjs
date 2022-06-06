import assert from 'assert';
import sinon from 'sinon';
import mockfs from 'mock-fs';
import httpMocks from 'node-mocks-http';

import wwwRoot from '../../../lib/wwwRoot.mjs';
import theLib from '../../../lib/index.mjs';
import theHelper from '../../helper.mjs';
import middleware from '../../../app/lookitAnyStory.mjs';


describe('lookitAnyStory', () => {
  const sandbox = sinon.createSandbox();
  let next;
  let req;
  let res;

  beforeEach(() => {
    next = sandbox.spy();

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
    middleware.forget();
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

    it('produces a response', async () => {
      assert(! theLib.config.get('caching'));

      // it resolves the Response
      const returned = await middleware(req, res, next);
      assert.equal(returned, res);

      assert.equal(wwwRoot.willLoadFile.callCount, 1);

      assert(! next.called);
      assert.equal(res._getData(), 'lookitAnyStory.ejs');
      assert.equal(res.statusCode, 200);

      // no caching
      assert.equal(Object.keys(middleware.cache).length, 0);

      const context = res._getRenderData();
      assert.equal(context.body, 'GLOB.FILE');
    });

    it('caches a response', async () => {
      theHelper.mockConfig({ caching: true });

      // un-cached
      await middleware(req, res, next);

      assert.equal(wwwRoot.willLoadFile.callCount, 1);

      assert(! next.called);
      assert.equal(res._getData(), 'lookitAnyStory.ejs');

      assert.equal(Object.keys(middleware.cache).length, 1);

      // and again, cached
      res = httpMocks.createResponse();
      await middleware(req, res, next);

      assert.equal(wwwRoot.willLoadFile.callCount, 1);

      assert(! next.called);
      assert.equal(res._getData(), 'lookitAnyStory.ejs');

      assert.equal(Object.keys(middleware.cache).length, 1);
    });
  });

  it('survives with no file contents', async () => {
    theHelper.mockGlob(sandbox, () => {
      return [ 'glob.file' ];
    });

    await middleware(req, res, next);

    assert(! next.called);
    assert.equal(res._getData(), 'lookitAnyStory.ejs');

    const context = res._getRenderData();
    assert.strictEqual(context.body, '');
  });

  it('will fail gracefully', async () => {
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
