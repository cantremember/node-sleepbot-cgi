import assert from 'assert';
import sinon from 'sinon';
import httpMocks from 'node-mocks-http';

import theLib from '../../../lib/index.mjs';
import middleware from '../../../app/morganIndex.mjs';


describe('morganIndex', () => {
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


  it('will redirect the "flat" <frame />-less UI', () => {
    req.cookies.morgan_config = 'flat';

    // it('is not complicated enough to warrant a return')
    const returned = middleware(req, res, next);
    assert.equal(returned, undefined);

    assert(! next.called);
    assert.equal(res._getRedirectUrl(), theLib.baseURL('/morgan/index_h.html'));
  });

  it('will redirect the <frame />-ful UI by default', () => {
    // it('is not complicated enough to warrant a return')
    const returned = middleware(req, res, next);
    assert.equal(returned, undefined);

    assert(! next.called);
    assert.equal(res._getRedirectUrl(), theLib.baseURL('/morgan/index_p.html'));
  });
});
