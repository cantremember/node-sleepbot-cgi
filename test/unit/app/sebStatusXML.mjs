import Promise from 'bluebird';
import assert from 'assert';
import sinon from 'sinon';
import httpMocks from 'node-mocks-http';
import axios from 'axios';

import theLib from '../../../lib/index';
import willHandle from '../../../app/sebStatusXML';


describe('sebStatusXML', () => {
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


  it('proxies from the primary Shoutcast server', () => {
    sandbox.stub(axios, 'request').callsFake((options) => {
      const { sebServerPrimary } = theLib;
      const { url, auth } = options;

      // some basics
      assert.equal(url.indexOf(sebServerPrimary.url), 0);
      assert(url.match(/mode=viewxml$/));
      assert.equal(auth.username, sebServerPrimary.user);
      assert.equal(auth.password, sebServerPrimary.pass);

      return Promise.resolve({
        data: 'BODY',
      });
    });

    return willHandle(req, res, cb)
    .then(() => {
      assert(! cb.called);
      assert(axios.request.calledOnce);

      assert.deepEqual(res._headers, { 'Content-Type': 'text/xml' });
      assert.equal(res.statusCode, 200);
      assert.equal(res._getData(), 'BODY');
    });
  });

  it('will fail gracefully', () => {
    sandbox.stub(axios, 'request').rejects(new Error('BOOM'));
    sandbox.spy(res, 'send');

    return willHandle(req, res, cb)
    .then(() => {
      assert(axios.request.calledOnce);
      assert(! res.send.called);

      // Express gets informed
      assert(cb.called);

      const err = cb.args[0][0];
      assert.equal(err.message, 'BOOM');
    });
  });
});
