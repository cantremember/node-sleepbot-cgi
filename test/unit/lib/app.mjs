import assert from 'assert';
import sinon from 'sinon';
import httpMocks from 'node-mocks-http';

import theApp, {
  logError,
} from '../../../lib/app';


describe('lib/app', () => {
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


  describe('theApp', () => {
    it('is our express server instance', () => {
      assert.equal(theApp.settings['view engine'], 'ejs');
    });
  });


  describe('logError', () => {
    it('does nothing without an Error', () => {
      logError(null, req, res, cb);

      assert.equal(cb.callCount, 1);
      assert.equal(cb.args[0].length, 0);
    });

    it('logs the Error', () => {
      /* eslint-disable no-console */
      sandbox.spy(console, 'error');

      logError(new Error('BOOM'), req, res, cb);

      assert.equal(console.error.callCount, 1);
      /* eslint-enable no-console */
    });

    it('responds with an Error#statusCode', () => {
      const err = new Error('Unauthorized');
      err.statusCode = 401;

      logError(err, req, res, cb);

      assert.equal(res._getStatusCode(), 401);
      assert(res._isJSON());

      const json = JSON.parse(res._getData());
      assert.equal(json.name, 'Error');
      assert.equal(json.message, 'Unauthorized');
    });

    it('responds with an Error#status', () => {
      const err = new Error('Not Found');
      err.name = 'NotFound';
      err.status = 404;

      logError(err, req, res, cb);

      assert.equal(res._getStatusCode(), 404);
      assert(res._isJSON());

      const json = JSON.parse(res._getData());
      assert.equal(json.name, 'NotFound');
      assert.equal(json.message, 'Not Found');
    });

    it('responds with an Error', () => {
      logError(new Error('BOOM'), req, res, cb);

      assert.equal(res._getStatusCode(), 500);
      assert(res._isJSON());

      const json = JSON.parse(res._getData());
      assert.equal(json.name, 'Error');
      assert.equal(json.message, 'BOOM');
    });
  });
});
