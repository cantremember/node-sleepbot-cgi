import assert from 'assert';
import sinon from 'sinon';
import httpMocks from 'node-mocks-http';

import theHelper from '../../helper';
import middleware from '../../../app/sebPlaylist.M3U';


describe('sebPlaylist.M3U', () => {
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
    assert.deepEqual(res._headers, { 'Content-Type': 'application/vnd.apple.mpegurl' });

    const PLAYLIST = `#EXTM3U
#EXTINF:-1,Sleepbot Environmental Broadcast - - sleepbot.com/seb/
http://server1.seb/
#EXTINF:-1,Sleepbot Environmental Broadcast - - sleepbot.com/seb/
http://server2.seb/
`;

    assert.equal(res._getData(), PLAYLIST);
  });
});
