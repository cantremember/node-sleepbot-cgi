import assert from 'assert';
import sinon from 'sinon';
import httpMocks from 'node-mocks-http';
import _ from 'lodash';

import theLib from '../../../lib/index';
import builder from '../../../app/redirectTo';

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
    assert.ok(_.isFunction(middleware));
  });

  it('will redirect to a route relative to baseURL', () => {
    // it('is not complicated enough to warrant a return')
    const returned = middleware(req, res, next);
    assert.equal(returned, undefined);

    assert(! next.called);
    assert.equal(res._getRedirectUrl(), theLib.baseURL(ROUTE));
  });
});
