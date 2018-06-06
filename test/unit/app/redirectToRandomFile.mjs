import assert from 'assert';
import sinon from 'sinon';
import httpMocks from 'node-mocks-http';
import _ from 'lodash';

import theLib from '../../../lib/index';
import theHelper from '../../helper';
import builder from '../../../app/redirectToRandomFile';


describe('redirectToRandomFile', () => {
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

    middleware = builder('path', 'some-glob');
  });
  afterEach(() => {
    sandbox.restore();
  });


  it('builds a middleware Function', () => {
    assert.ok(_.isFunction(middleware));
  });

  it('will redirect to a route relative to baseURL', () => {
    theHelper.mockGlob(sandbox, () => {
      return [ 'glob.file' ];
    });

    return middleware(req, res, next)
    .then((_res) => {
      // it resolves the Response
      assert.equal(_res, res);

      assert(! next.called);
      assert.equal(res._getRedirectUrl(), theLib.baseURL('path/glob.file'));
    });
  });

  it('fails without any files', () => {
    theHelper.mockGlob(sandbox, () => {
      return [];
    });

    return middleware(req, res, next)
    .then(() => {
      const err = next.args[0][0];
      assert(err.message.match(/no glob results/));
    });
  });

  it('will fail gracefully', () => {
    theHelper.mockGlob(sandbox, () => {
      throw new Error('BOOM');
    });
    sandbox.stub(res, 'send');

    return middleware(req, res, next)
    .then((_res) => {
      // it resolves the Response
      assert.equal(_res, res);

      assert(! res.send.called);

      // Express gets informed
      assert(next.called);

      const err = next.args[0][0];
      assert.equal(err.message, 'BOOM');
    });
  });
});
