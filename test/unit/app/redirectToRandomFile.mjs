import assert from 'assert';
import sinon from 'sinon';
import httpMocks from 'node-mocks-http';

import theLib from '../../../lib/index';
import theHelper from '../../helper';
import willHandle from '../../../app/redirectToRandomFile';


describe('redirectToRandomFile', () => {
  const sandbox = sinon.createSandbox();
  let cb;
  let req;
  let res;
  let handle;

  beforeEach(() => {
    cb = sandbox.spy();

    // mock Request & Response
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();

    handle = willHandle('path', 'some-glob');
  });
  afterEach(() => {
    sandbox.restore();
  });


  it('will redirect to a route relative to baseURL', () => {
    theHelper.mockGlob(sandbox, () => {
      return [ 'glob.file' ];
    });

    return handle(req, res, cb)
    .then(() => {
      assert(! cb.called);
      assert.equal(res._getRedirectUrl(), theLib.baseURL('path/glob.file'));
    });
  });

  it('fails without any files', () => {
    theHelper.mockGlob(sandbox, () => {
      return [];
    });

    return handle(req, res, cb)
    .then(() => {
      const err = cb.args[0][0];
      assert(err.message.match(/no glob results/));
    });
  });

  it('will fail gracefully', () => {
    theHelper.mockGlob(sandbox, () => {
      throw new Error('BOOM');
    });
    sandbox.stub(res, 'send');

    return handle(req, res, cb)
    .then(() => {
      assert(! res.send.called);

      // Express gets informed
      assert(cb.called);

      const err = cb.args[0][0];
      assert.equal(err.message, 'BOOM');
    });
  });
});
