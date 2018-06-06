import assert from 'assert';
import sinon from 'sinon';
import httpMocks from 'node-mocks-http';

import theLib from '../../../lib/index';
import willHandle from '../../../app/http404';


describe('http404', () => {
  const sandbox = sinon.createSandbox();
  let cb;
  let req;
  let res;

  beforeEach(() => {
    cb = sandbox.spy();

    // mock Request & Response
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
  });
  afterEach(() => {
    sandbox.restore();
  });


  it('will render its page', () => {
    return willHandle(req, res, cb)
    .then((_res) => {
      // it resolves the Response
      assert.equal(_res, res);

      assert(! cb.called);

      assert.equal(res._getRenderView(), 'http404.ejs');
      assert.equal(res._getData(), 'http404.ejs');
      assert.equal(res.statusCode, 404);
    });
  });

  it('will fail gracefully', () => {
    sandbox.stub(theLib, 'willRenderView').rejects(new Error('BOOM'));
    sandbox.spy(res, 'send');

    return willHandle(req, res, cb)
    .then((_res) => {
      // it resolves the Response
      assert.equal(_res, res);

      assert(theLib.willRenderView.calledOnce);
      assert(! res.send.called);

      // Express gets informed
      assert(cb.called);

      const err = cb.args[0][0];
      assert.equal(err.message, 'BOOM');
    });
  });
});
