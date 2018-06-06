import assert from 'assert';
import sinon from 'sinon';
import httpMocks from 'node-mocks-http';

import theHelper from '../../helper';
import middleware from '../../../app/sebPlaylist';


describe('sebPlaylist', () => {
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


  it('renders a Shoutcast playlist', () => {
    theHelper.mockConfig({
      sebServers: [
        { url: 'http://server1.seb/' },
        { url: 'http://server2.seb/' },
      ],
    });

    // it('is not complicated enough to warrant a return')
    const returned = middleware(req, res, next);
    assert.equal(returned, undefined);

    assert(! next.called);
    assert.deepEqual(res._headers, { 'Content-Type': 'audio/x-scpls' });

    const PLAYLIST = `[playlist]
numberofentries=2
Version=2
File1=http://server1.seb/
Title1=Sleepbot Environmental Broadcast
Length1=-1
File2=http://server2.seb/
Title2=Sleepbot Environmental Broadcast
Length2=-1
`;

    assert.equal(res._getData(), PLAYLIST);
  });
});
