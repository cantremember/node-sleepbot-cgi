import assert from 'assert';
import sinon from 'sinon';
import httpMocks from 'node-mocks-http';
import { isFunction } from 'lodash-es';

import theLib from '../../../lib/index.mjs';
import builder from '../../../app/redirectTo.mjs';

const ROUTE = '/ROUTE';


describe('redirectTo', () => {
  const sandbox = sinon.createSandbox();
  let next;
  let req;
  let res;
  let middleware;

  beforeEach(() => {
    next = sandbox.spy();

    // mock Request & Response
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();

    middleware = builder(ROUTE);
  });


  it('builds a middleware Function', () => {
    assert.ok(isFunction(middleware));
  });

  it('will redirect to a route relative to baseURL', () => {
    // it('is not complicated enough to warrant a return')
    const returned = middleware(req, res, next);
    assert.equal(returned, undefined);

    assert(! next.called);
    assert.equal(res._getRedirectUrl(), theLib.baseURL(ROUTE));
  });
});
