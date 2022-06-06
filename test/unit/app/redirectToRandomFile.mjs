import assert from 'assert';
import sinon from 'sinon';
import httpMocks from 'node-mocks-http';
import _ from 'lodash';

import theLib from '../../../lib/index.mjs';
import theHelper from '../../helper.mjs';
import builder from '../../../app/redirectToRandomFile.mjs';


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

  it('will redirect to a route relative to baseURL', async () => {
    theHelper.mockGlob(sandbox, () => {
      return [ 'glob.file' ];
    });

    // it resolves the Response
    const returned = await middleware(req, res, next);
    assert.equal(returned, res);

    assert(! next.called);
    assert.equal(res._getRedirectUrl(), theLib.baseURL('path/glob.file'));
  });

  it('fails without any files', async () => {
    theHelper.mockGlob(sandbox, () => {
      return [];
    });

    await middleware(req, res, next);

    const err = next.args[0][0];
    assert(err.message.match(/no glob results/));
  });

  it('will fail gracefully', async () => {
    theHelper.mockGlob(sandbox, () => {
      throw new Error('BOOM');
    });
    sandbox.stub(res, 'send');

    // it resolves the Response
    const returned = await middleware(req, res, next);
    assert.equal(returned, res);

    assert(! res.send.called);

    // Express gets informed
    assert(next.called);

    const err = next.args[0][0];
    assert.equal(err.message, 'BOOM');
  });
});
