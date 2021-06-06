import assert from 'assert';
import sinon from 'sinon';
import httpMocks from 'node-mocks-http';

import theHelper from '../../helper';
import middleware from '../../../app/sebPlaylist.RM';


describe('sebPlaylist.RM', () => {
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
    theHelper.mockConfig();
  });


  it('renders a playlist', () => {
    theHelper.mockConfig({
      sebServers: [
        { streamUrl: 'http://server1.seb/' },
        { streamUrl: 'http://server2.seb/' },
      ],
    });

    // it('is not complicated enough to warrant a return')
    const returned = middleware(req, res, next);
    assert.equal(returned, undefined);

    assert(! next.called);
    assert.deepEqual(res._headers, { 'Content-Type': 'application/vnd.rn-realmedia' });

    const PLAYLIST = `http://server1.seb/
http://server2.seb/
`;

    assert.equal(res._getData(), PLAYLIST);
  });
});
