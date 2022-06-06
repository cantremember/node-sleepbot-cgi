import assert from 'assert';
import sinon from 'sinon';
import httpMocks from 'node-mocks-http';

import middleware from '../../../app/lookitImgFoley.mjs';


describe('lookitImgFoley', () => {
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
  });


  it('produces a response with parameters', async () => {
    const TITLE = 'TITLE';
    const IMAGE = 'IMAGE';

    req.query = {
      title: TITLE,
      image: IMAGE,
    };

    // it resolves the Response
    const returned = await middleware(req, res, next);
    assert.equal(returned, res);

    assert(! next.called);
    assert.equal(res._getData(), 'lookitImgFoley.ejs');
    assert.equal(res.statusCode, 200);

    const context = res._getRenderData();
    assert.equal(context.title, TITLE);
    assert.equal(context.image, '/lookit/images/dfoley/IMAGE');
  });

  it('produces a (crappy) response without parameters', async () => {
    await middleware(req, res, next);

    assert(! next.called);
    assert.equal(res._getData(), 'lookitImgFoley.ejs');
    assert.equal(res.statusCode, 200);

    const context = res._getRenderData();
    assert.equal(context.title, '(image)');
    assert.equal(context.image, '/images/shim_clear.gif');
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
