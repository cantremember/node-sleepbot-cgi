import assert from 'assert';
import sinon from 'sinon';
import httpMocks from 'node-mocks-http';

import theLib from '../../../lib/index';
import middleware from '../../../app/http404';


describe('http404', () => {
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


  it('will render its page', async () => {
    // it resolves the Response
    const returned = await middleware(req, res, next);
    assert.equal(returned, res);

    assert(! next.called);

    assert.equal(res._getRenderView(), 'http404.ejs');
    assert.equal(res._getData(), 'http404.ejs');
    assert.equal(res.statusCode, 404);
  });

  it('will fail gracefully', async () => {
    sandbox.stub(theLib, 'willRenderView').rejects(new Error('BOOM'));
    sandbox.spy(res, 'send');

    // it resolves the Response
    const returned = await middleware(req, res, next);
    assert.equal(returned, res);

    assert(theLib.willRenderView.calledOnce);
    assert(! res.send.called);

    // Express gets informed
    assert(next.called);

    const err = next.args[0][0];
    assert.equal(err.message, 'BOOM');
  });
});
