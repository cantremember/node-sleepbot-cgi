import assert from 'assert';
import sinon from 'sinon';
import httpMocks from 'node-mocks-http';
import axios from 'axios';

import theLib from '../../../lib/index';
import middleware from '../../../app/sebStatusXML';


describe('sebStatusXML', () => {
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


  it('proxies from the primary Shoutcast server', async () => {
    sandbox.stub(axios, 'request').callsFake(async (options) => { // eslint-disable-line require-await
      const { sebServerPrimary } = theLib;
      const { url, auth } = options;

      // some basics
      assert.equal(url.indexOf(sebServerPrimary.serverUrl), 0);
      assert(url.match(/statistics$/));
      assert.equal(auth.username, sebServerPrimary.user);
      assert.equal(auth.password, sebServerPrimary.pass);

      return {
        data: 'BODY',
      };
    });

    // it resolves the Response
    const returned = await middleware(req, res, next);
    assert.equal(returned, res);

    assert(! next.called);
    assert(axios.request.calledOnce);

    assert.deepEqual(res._headers, { 'Content-Type': 'text/xml' });
    assert.equal(res.statusCode, 200);
    assert.equal(res._getData(), 'BODY');
  });

  it('will fail gracefully', async () => {
    sandbox.stub(axios, 'request').rejects(new Error('BOOM'));
    sandbox.spy(res, 'send');

    // it resolves the Response
    const returned = await middleware(req, res, next);
    assert.equal(returned, res);

    assert(axios.request.calledOnce);
    assert(! res.send.called);

    // Express gets informed
    assert(next.called);

    const err = next.args[0][0];
    assert.equal(err.message, 'BOOM');
  });
});
