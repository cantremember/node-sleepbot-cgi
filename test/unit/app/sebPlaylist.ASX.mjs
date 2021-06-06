import assert from 'assert';
import sinon from 'sinon';
import httpMocks from 'node-mocks-http';

import theHelper from '../../helper';
import middleware from '../../../app/sebPlaylist.ASX';


describe('sebPlaylist.ASX', () => {
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
    assert.deepEqual(res._headers, { 'Content-Type': 'video/x-ms-asf' });

    const PLAYLIST = `<ASX version="3.0">
  <TITLE>Sleepbot Environmental Broadcast - - sleepbot.com/seb/</TITLE>
  <PARAM name="HTMLView" value="http://sleepbot.com/seb" />
  <ENTRY>
    <REF href="http://server1.seb/" />
    <TITLE>Sleepbot Environmental Broadcast - - sleepbot.com/seb/</TITLE>
    <PARAM name="HTMLView" value="http://sleepbot.com/seb" />
  </ENTRY>
  <ENTRY>
    <REF href="http://server2.seb/" />
    <TITLE>Sleepbot Environmental Broadcast - - sleepbot.com/seb/</TITLE>
    <PARAM name="HTMLView" value="http://sleepbot.com/seb" />
  </ENTRY>
</ASX>
`;

    assert.equal(res._getData(), PLAYLIST);
  });
});
