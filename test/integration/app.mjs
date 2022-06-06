/*
  ```sh
  # Coverage

  curl -v 'http://localhost:3000/status.cgi'
  curl -v 'http://localhost:3000/404.cgi'
  curl -v 'http://localhost:3000/cgi/animbot.cgi'
  curl -v 'http://localhost:3000/ambience/cgi/listen.cgi'
  curl -v 'http://localhost:3000/ambience/cgi/listen.cgi/listen.pls'
  curl -v 'http://localhost:3000/ambience/cgi/listen.asx'
  curl -v 'http://localhost:3000/ambience/cgi/listen.m3u'
  curl -v 'http://localhost:3000/ambience/cgi/listen.pls'
  curl -v 'http://localhost:3000/ambience/cgi/listen.rm'
  curl -v 'http://localhost:3000/ambience/cgi/7.cgi'
  curl -v 'http://localhost:3000/ambience/cgi/viewxml.cgi'
  curl -v 'http://localhost:3000/ambience/cgi/imgpage.cgi'
  curl -v 'http://localhost:3000/ambience/cgi/any_f.cgi'
  curl -v 'http://localhost:3000/critturs/cgi/anyaudio.cgi'
  curl -v 'http://localhost:3000/critturs/cgi/critlogo.cgi'
  curl -v 'http://localhost:3000/fucc/cgi/anyaudio.cgi'
  curl -v 'http://localhost:3000/fucc/cgi/schednow.cgi'
  curl -v 'http://localhost:3000/lookit/cgi/anyfoley.cgi'
  curl -v 'http://localhost:3000/lookit/cgi/anystory.cgi'
  curl -v 'http://localhost:3000/lookit/cgi/imgfoley.cgi'
  curl -v 'http://localhost:3000/morgan/cgi/morglay.cgi'
  curl -v 'http://localhost:3000/morgan/cgi/morgpick.cgi'
  curl -v 'http://localhost:3000/morgan/index.cgi'
  curl -v 'http://localhost:3000/morgan/index.derp'
  curl -v 'http://localhost:3000/morgan/'
  curl -v 'http://localhost:3000/morgan'
  curl -v 'http://localhost:3000/WRLDtime/cgi/anyclock.cgi'
  curl -v 'http://localhost:3000/WRLDtime/cgi/utc.cgi'
  ```
*/

import assert from 'assert';
import { promisify } from 'util';
import sinon from 'sinon';
import mockfs from 'mock-fs';
import supertest from 'supertest';
import nock from 'nock';

supertest.Test.prototype.endAsync = promisify(supertest.Test.prototype.end);

import wwwRoot from '../../lib/wwwRoot.mjs';
import theLib from '../../lib/index.mjs';
import theApp from '../../lib/app.mjs';
import theHelper from '../helper.mjs';

const { mitm } = theHelper;


const NO_DATA = Buffer.alloc(0);
const QUIP_DATA = `
text
quip
`;

const NOCK_DATA = 'NOCK_DATA';
const NOCK_SEB_URL = 'http://seb.nock'; // does not undergo DNS resolution
const NOCK_SEB_PRIMARY = {
  serverUrl: NOCK_SEB_URL,
  primary: true,
  user: 'USER',
  pass: 'PASS',
};

function _mockGlobFile(sandbox) {
  theHelper.mockGlob(sandbox, () => {
    return [ 'glob.file' ];
  });
}

function _client() {
  return supertest(theApp);
}

function _bodyIncludes(string, doesArg) {
  const does = doesArg || (doesArg === undefined);
  return (res) => {
    const text = (
      res.text ||
      // if the MIME type seems binary, it'll be a Buffer
      res.body.toString() ||
      // "If the response is ok, it should return falsy"
      ''
    );
    if (text.includes(string) === does) {
      return;
    }
    throw new Error([ 'does not include "', string, '"' ].join(''));
  };
}

function _redirectsTo(route) {
  const absolute = [ theLib.config.get('baseURL'), route ].join('');
  return (res) => {
    // "If the response is ok, it should return falsy"
    if ((res.headers.location || '').indexOf(absolute) === 0) {
      return;
    }
    throw new Error([ 'does not redirect to "', route, '"' ].join(''));
  };
}


describe('app integration', () => {
  const sandbox = sinon.createSandbox();

  before(function() { // no => capturing of `this`
    // explicity load the App up-front;
    //   it'll take a few moments, even if we let it happen 'naturally',
    //   but we do it manually, to ensure mock-fs will not affect App loading
    console.log('    (registering the Express app ... this may take a moment ...)'); // eslint-disable-line no-console
    this.timeout(30000); // eslint-disable-line no-invalid-this
  });
  afterEach(() => {
    sandbox.restore();

    theHelper.mockConfig();

    mockfs.restore();
    nock.cleanAll();
    mitm.disable();
  });


  it('has access to HTTP assets', async () => {
    mockfs({ '/mock-fs': {
      'index.html': NO_DATA,
    } });

    const exists = await wwwRoot.willDetectFile('index.html');
    assert(exists);
  });


  it('GET /status.cgi', async () => {
    await _client().get('/status.cgi')
    .expect(200)
    .expect('content-type', /json/)
    .endAsync();
  });

  describe('GET /404.cgi', () => {
    beforeEach(() => {
      mockfs({ '/mock-fs': {
        'http404.ejs': theHelper.realEjs('http404.ejs'),
      } });
    });

    it('without headers', async () => {
      await _client().get('/404.cgi')
      .expect(404)
      .expect('content-type', /html/)
      .expect(_bodyIncludes('<base href="http://localhost:3000">'))
      .expect(_bodyIncludes('<title>Sleepbot Constructs:  404 Not Found</title>'))
      .expect(_bodyIncludes('That\'s net-speak for "I can\'t find any information for":', false))
      .endAsync();
    });

    it('with headers', async () => {
      await _client().get('/404.cgi')
      .set('x-real-uri', 'REAL-URI')
      .expect(404)
      .expect('content-type', /html/)
      .expect(_bodyIncludes('<title>Sleepbot Constructs:  404 Not Found</title>'))
      .expect(_bodyIncludes('REAL-URI'))
      .endAsync();
    });
  });


  it('GET /cgi/animbot.cgi', async () => {
    _mockGlobFile(sandbox);

    await _client().get('/cgi/animbot.cgi')
    .expect(302)
    .expect(_redirectsTo('/images/animbot/glob.file'))
    .endAsync();
  });


  it('GET /ambience/cgi/listen.cgi', async () => {
    await _client().get('/ambience/cgi/listen.cgi')
    .expect(200)
    .expect('content-type', /vnd.apple.mpegurl/)
    .expect(_bodyIncludes('#EXTM3U'))
    .endAsync();
  });

  it('GET /ambience/cgi/listen.cgi/listen.pls', async () => {
    await _client().get('/ambience/cgi/listen.cgi/listen.pls')
    .expect(200)
    .expect('content-type', /x-scpls/)
    .expect(_bodyIncludes('[playlist]'))
    .endAsync();
  });

  it('GET /ambience/cgi/listen.asx', async () => {
    await _client().get('/ambience/cgi/listen.asx')
    .expect(200)
    .expect('content-type', /x-ms-asf/)
    .expect(_bodyIncludes('<ASX '))
    .endAsync();
  });

  it('GET /ambience/cgi/listen.m3u', async () => {
    await _client().get('/ambience/cgi/listen.m3u')
    .expect(200)
    .expect('content-type', /vnd.apple.mpegurl/)
    .expect(_bodyIncludes('#EXTM3U'))
    .endAsync();
  });

  it('GET /ambience/cgi/listen.pls', async () => {
    await _client().get('/ambience/cgi/listen.pls')
    .expect(200)
    .expect('content-type', /x-scpls/)
    .expect(_bodyIncludes('[playlist]'))
    .endAsync();
  });

  it('GET /ambience/cgi/listen.rm', async () => {
    await _client().get('/ambience/cgi/listen.rm')
    .expect(200)
    .expect('content-type', /vnd.rn-realmedia/)
    .expect((res) => {
      // one line per stream URL, and a trailing '\n'
      const text = (res.text || '');
      assert.strictEqual(text.split('\n').length, 3);
    })
    .endAsync();
  });


  it('GET /ambience/cgi/7.cgi', async () => {
    // mock data for `sebServerPrimary`
    theHelper.mockConfig({
      sebServers: [ NOCK_SEB_PRIMARY ],
    });

    // produces HTTP 404 unless everything matches
    const nocked = nock(NOCK_SEB_URL)
    .get('/7.html')
    .matchHeader('user-agent', /XML Getter/)
    .reply(200, NOCK_DATA);

    await _client().get('/ambience/cgi/7.cgi')
    .expect(200)
    .expect('content-type', /html/)
    .expect(_bodyIncludes(NOCK_DATA))
    .expect(() => {
      assert.ok(nocked.isDone());
    })
    .endAsync();
  });

  it('GET /ambience/cgi/viewxml.cgi', async () => {
    // mock data for `sebServerPrimary`
    theHelper.mockConfig({
      sebServers: [ NOCK_SEB_PRIMARY ],
    });

    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication
    const authorization = Buffer.from('USER:PASS').toString('base64');

    // produces HTTP 404 unless everything matches
    const nocked = nock(NOCK_SEB_URL)
    .get('/statistics')
    .matchHeader('user-agent', /^XML Getter/)
    .matchHeader('authorization', `Basic ${ authorization }`)
    .reply(200, NOCK_DATA, {
      'www-authenticate': 'basic realm="Shoutcast Server"',
    });

    await _client().get('/ambience/cgi/viewxml.cgi')
    .expect(200)
    .expect('content-type', /xml/)
    .expect(_bodyIncludes(NOCK_DATA))
    .expect(() => {
      assert.ok(nocked.isDone());
    })
    .endAsync();
  });

  it('GET /ambience/cgi/imgpage.cgi', async () => {
    await _client().get('/ambience/cgi/imgpage.cgi')
    .expect(302)
    .expect(_redirectsTo('/ambience'))
    .endAsync();
  });

  describe('GET /ambience/cgi/any_f.cgi', () => {
    it('without data', async () => {
      mockfs({ '/mock-fs': {
        'ambience': { },
        'ambienceAnySample.ejs': theHelper.realEjs('ambienceAnySample.ejs'),
      } });

      await _client().get('/ambience/cgi/any_f.cgi')
      .expect(500, JSON.stringify({
        name: 'Error',
        message: 'ENOENT, no such file or directory \'/mock-fs/ambience/any.txt\'',
      }))
      .expect('content-type', /json/)
      .endAsync();
    });

    it('with data', async () => {
      mockfs({ '/mock-fs': {
        'ambience': {
          'any.txt': `
FILE\tEXT\tPAGE\tSTUB\tARTIST\tALBUM\tTRACK\tSIZE
file\text\tpage\tstub\tartist\talbum\ttrack\tsize
`,
          'anyquip.txt': QUIP_DATA,
        },
        'ambienceAnySample.ejs': theHelper.realEjs('ambienceAnySample.ejs'),
      } });

      await _client().get('/ambience/cgi/any_f.cgi')
      .expect(200)
      .expect('content-type', /html/)
      .expect(_bodyIncludes('<base href="http://localhost:3000">'))
      .expect(_bodyIncludes('<title>Ambience by the Dice :: Ambience for the Masses</title>'))
      .expect(_bodyIncludes('href="/ambience/album/stub'))
      .expect(_bodyIncludes('quip<br />'))
      .endAsync();
    });
  });


  it('GET /critturs/cgi/anyaudio.cgi', async () => {
    _mockGlobFile(sandbox);

    await _client().get('/critturs/cgi/anyaudio.cgi')
    .expect(302)
    .expect(_redirectsTo('/critturs/mp2/glob.file'))
    .endAsync();
  });

  it('GET /critturs/cgi/critlogo.cgi', async () => {
    _mockGlobFile(sandbox);

    await _client().get('/critturs/cgi/critlogo.cgi')
    .expect(302)
    .expect(_redirectsTo('/critturs/images/logo/glob.file'))
    .endAsync();
  });


  it('GET /fucc/cgi/anyaudio.cgi', async () => {
    _mockGlobFile(sandbox);

    await _client().get('/fucc/cgi/anyaudio.cgi')
    .expect(302)
    .expect(_redirectsTo('/fucc/mpg/glob.file'))
    .endAsync();
  });

  describe('GET /fucc/cgi/schednow.cgi', () => {
    let date;
    beforeEach(() => {
      date = new Date();
    });

    it('without data', async () => {
      mockfs({ '/mock-fs': {
        'fucc': { },
        'fuccSchedule.ejs': theHelper.realEjs('fuccSchedule.ejs'),
      } });

      await _client().get('/fucc/cgi/schednow.cgi')
      .expect(500, JSON.stringify({
        name: 'Error',
        message: 'ENOENT, no such file or directory \'/mock-fs/fucc/showquip.txt\'',
      }))
      .expect('content-type', /json/)
      .endAsync();
    });

    it('with dead data', async () => {
      mockfs({ '/mock-fs': {
        'fucc': {
          'dead.txt': 'DEAD',
          'showquip.txt': QUIP_DATA,
        },
        'fuccSchedule.ejs': theHelper.realEjs('fuccSchedule.ejs'),
      } });

      await _client().get('/fucc/cgi/schednow.cgi')
      .expect(200)
      .expect('content-type', /html/)
      .expect(_bodyIncludes('<TITLE>F.U.C.C Radio Now</TITLE>'))
      .expect(_bodyIncludes('<!-- DEAD -->'))
      .expect(_bodyIncludes('<FONT SIZE=+1>quip</FONT>', false))
      .endAsync();
    });

    it('with live data', async () => {
      mockfs({ '/mock-fs': {
        'fucc': {
          'live.txt': `
file\tanchor\tyear\tmonth\tday\thourStart\thourEnd
file\tanchor\t${
  date.getYear() }\t${ date.getMonth() }\t${ date.getDate() }\t${
  date.getHours() }\t${ date.getHours() + 1
}
`,
          'live.html': `
<A NAME="anchor">
live1
live2
live3
`,
          'showquip.txt': QUIP_DATA,
        },
        'fuccSchedule.ejs': theHelper.realEjs('fuccSchedule.ejs'),
      } });

      await _client().get('/fucc/cgi/schednow.cgi')
      .expect(200)
      .expect('content-type', /html/)
      .expect(_bodyIncludes('<TITLE>F.U.C.C Radio Now</TITLE>'))
      .expect(_bodyIncludes('<!-- ON -->'))
      .expect(_bodyIncludes('live1\nlive2\nlive3'))
      .expect(_bodyIncludes('HREF="/fucc/file#anchor"', false)) // no title
      .expect(_bodyIncludes('<FONT SIZE=+1>quip</FONT>'))
      .endAsync();
    });

    it('with show data', async () => {
      mockfs({ '/mock-fs': {
        'fucc': {
          'show.txt': `
file\tanchor\tdayOfWeek\thourStart\thourEnd
file\tanchor\t${ date.getDay() }\t${ date.getHours() }\t${ date.getHours() + 1 }
`,
          'show.html': `
<A NAME="anchor">
show1
show2
<!-- start -->
title
show3
<!-- end -->
`,
          'showquip.txt': QUIP_DATA,
        },
        'fuccSchedule.ejs': theHelper.realEjs('fuccSchedule.ejs'),
      } });

      await _client().get('/fucc/cgi/schednow.cgi')
      .expect(200)
      .expect('content-type', /html/)
      .expect(_bodyIncludes('<TITLE>F.U.C.C Radio Now</TITLE>'))
      .expect(_bodyIncludes('<!-- ON -->'))
      .expect(_bodyIncludes('show1\nshow2\nshow3'))
      .expect(_bodyIncludes('HREF="/fucc/file#anchor">title</A>'))
      .expect(_bodyIncludes('<FONT SIZE=+1>quip</FONT>'))
      .endAsync();
    });
  });


  it('GET /lookit/cgi/anyfoley.cgi', async () => {
    _mockGlobFile(sandbox);

    await _client().get('/lookit/cgi/anyfoley.cgi')
    .expect(302)
    .expect(_redirectsTo('/lookit/etc/glob.file'))
    .endAsync();
  });

  it('GET /lookit/cgi/anystory.cgi', async () => {
    _mockGlobFile(sandbox);

    mockfs({ '/mock-fs': {
      'lookit': {
        'story': {
          'glob.file': 'GLOB.FILE',
        }
      },
      'lookitAnyStory.ejs': theHelper.realEjs('lookitAnyStory.ejs'),
    } });

    await _client().get('/lookit/cgi/anystory.cgi')
    .expect(200)
    .expect('content-type', /html/)
    .expect(_bodyIncludes('<BASE HREF="http://localhost:3000">'))
    .expect(_bodyIncludes('<TITLE>Lookit Tells You a Story</TITLE>'))
    .expect(_bodyIncludes('<A HREF="/" TARGET="_top"><TT><B>Sleepbot Constructs</B></TT></A><BR>'))
    .expect(_bodyIncludes('GLOB.FILE'))
    .endAsync();
  });

  describe('GET /lookit/cgi/imgfoley.cgi', () => {
    beforeEach(() => {
      mockfs({ '/mock-fs': {
        'lookitImgFoley.ejs': theHelper.realEjs('lookitImgFoley.ejs'),
      } });
    });

    it('without parameters', async () => {
      await _client().get('/lookit/cgi/imgfoley.cgi')
      .expect(200)
      .expect('content-type', /html/)
      .expect(_bodyIncludes('<base href="http://localhost:3000">'))
      .expect(_bodyIncludes('<title>d f o l e y   @   s l e e p b o t . c o m :: :: (image)</title>'))
      .expect(_bodyIncludes('src="/images/shim_clear.gif" title="(image)"'))
      .endAsync();
    });

    it('with parameters', async () => {
      await _client().get('/lookit/cgi/imgfoley.cgi')
      .query({ title: 'TITLE', image: 'IMAGE' })
      .expect(200)
      .expect('content-type', /html/)
      .expect(_bodyIncludes('<title>d f o l e y   @   s l e e p b o t . c o m :: :: TITLE</title>'))
      .expect(_bodyIncludes('src="/lookit/images/dfoley/IMAGE" title="TITLE"'))
      .endAsync();
    });
  });

  describe('GET /morgan/cgi/morglay.cgi', () => {
    it('without data', async () => {
      mockfs({ '/mock-fs': {
        'morgan': { },
        'morganLayout.ejs': theHelper.realEjs('morganLayout.ejs'),
      } });

      await _client().get('/morgan/cgi/morglay.cgi')
      .expect(500, JSON.stringify({
        name: 'Error',
        message: 'ENOENT, no such file or directory \'/mock-fs/morgan/card.txt\'',
      }))
      .expect('content-type', /json/)
      .endAsync();
    });

    describe('with data', () => {
      beforeEach(() => {
        mockfs({ '/mock-fs': {
          'morgan': {
            'card.txt': `
id\tabbrev\ttitle
1\tone\tONE
2\ttwo\tTWO
3\tthree\tTHREE
4\tfour\tFOUR
5\tfive\tFIVE
`,
          },
          'morganLayout.ejs': theHelper.realEjs('morganLayout.ejs'),
        } });
      });

      it('without parameters', async () => {
        await _client().get('/morgan/cgi/morglay.cgi')
        .expect(200)
        .expect('content-type', /html/)
        .expect(_bodyIncludes('<TITLE>Morgan\'s Tarot:  '))
        .expect(_bodyIncludes('<BASE HREF="http://localhost:3000">'))
        .expect(_bodyIncludes('Your 3 cards'))
        .endAsync();
      });

      it('with parameters', async () => {
        await _client().get('/morgan/cgi/morglay.cgi')
        .query({ cards: 23 })
        .expect(200)
        .expect('content-type', /html/)
        .expect(_bodyIncludes('<TITLE>Morgan\'s Tarot:  '))
        .expect(_bodyIncludes('Your 5 cards')) // all we have is 5
        .expect(_bodyIncludes('<A HREF="/morgan/card/one.html'))
        .expect(_bodyIncludes('TITLE="TWO"'))
        .expect(_bodyIncludes('ALT="THREE"'))
        .expect(_bodyIncludes('window.status=\'FOUR\''))
        .expect(_bodyIncludes('/morgan/images/card/five.gif'))
        .endAsync();
      });
    });
  });

  it('GET /morgan/cgi/morgpick.cgi', async () => {
    _mockGlobFile(sandbox);

    await _client().get('/morgan/cgi/morgpick.cgi')
    .expect(302)
    .expect(_redirectsTo('/morgan/card/glob.file'))
    .endAsync();
  });

  [
    '/morgan/index.cgi',
    '/morgan/index.derp',
    '/morgan/',
    '/morgan'
  ].forEach((route) => {
    it(('GET ' + route), async () => {
      await _client().get(route)
      .expect(302)
      .expect(_redirectsTo('/morgan/index_p.html'))
      .endAsync();
    });
  });

  it('GET /morgan, with a cookie', async () => {
    await _client().get('/morgan')
    .set('cookie', 'morgan_config=flat')
    .expect(302)
    .expect(_redirectsTo('/morgan/index_h.html'))
    .endAsync();
  });


  it('GET /WRLDtime/cgi/anyclock.cgi', async () => {
    _mockGlobFile(sandbox);

    await _client().get('/WRLDtime/cgi/anyclock.cgi')
    .expect(302)
    .expect(_redirectsTo('/WRLDtime/face/glob.file'))
    .endAsync();
  });

  it.skip('GET /WRLDtime/cgi/utc.cgi', async () => {
    mitm.enable();

    // mock data for `ntpServers`
    const MITM_NTP_SERVER = 'localhost'; // to avoid "Error: getaddrinfo ENOTFOUND"
    theHelper.mockConfig({
      ntpServers: [ MITM_NTP_SERVER ],
    });

    let socketError;
    const ntpResponse = sandbox.spy((socket) => {
      try {
        // fails in Node 10
        //   TypeError [ERR_INVALID_ARG_TYPE]: The "err" argument must be of type number. Received type undefined
        //   could be Node, could be `mitm`, i'm not sure
        socket.setNoDelay(true);
        socket.write(NOCK_DATA, 'utf8');
        socket.end();
      }
      catch (err) {
        socketError = err;
      }
      finally {
        socket.destroy();
      }
    });
    function ntpFilter(options) {
      const { host, port } = options;
      return ((host === MITM_NTP_SERVER) && (port === 13));
    }

    mitm.on('connect', (socket, options) => {
      if (! ntpFilter(options)) {
        socket.bypass();
        return;
      }

      // wait for listeners to be applied
      setTimeout(() => {
        ntpResponse(socket);
      }, 1000);
    });
    mitm.on('connection', (socket, options) => {
      if (! ntpFilter(options)) {
        socket.bypass();
        return;
      }
    });

    await _client().get('/WRLDtime/cgi/utc.cgi')
    // .expect(200)
    // .expect('content-type', /plain/)
    // .expect(_bodyIncludes(NOCK_DATA))
    .expect(503)
    .expect(() => {
      assert.ok(ntpResponse.called);
      assert.ok(socketError);
      assert.ok((/The "err" argument must be of type number./).test(socketError.message), socketError.message);
    })
    .endAsync();
  });
});
