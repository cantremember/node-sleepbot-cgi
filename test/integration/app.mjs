/*
  ```sh
  # Coverage

  curl -v 'http://localhost:3000/status.cgi'
  curl -v 'http://localhost:3000/404.cgi'
  curl -v 'http://localhost:3000/cgi/animbot.cgi'
  curl -v 'http://localhost:3000/ambience/cgi/listen.cgi'
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

import Promise from 'bluebird';
import assert from 'assert';
import sinon from 'sinon';
import mockfs from 'mock-fs';
import supertest from 'supertest';
import nock from 'nock';

supertest.Test.prototype.endAsync = Promise.promisify(supertest.Test.prototype.end);

import wwwRoot from '../../lib/wwwRoot';
import theLib from '../../lib/index';
import theApp from '../../lib/app';
import theHelper from '../helper';

const { mitm } = theHelper;


const NO_DATA = Buffer.alloc(0);
const QUIP_DATA = `
text
quip
`;

const NOCK_DATA = 'NOCK_DATA';
const NOCK_SEB_URL = 'http://seb.nock'; // does not undergo DNS resolution
const NOCK_SEB_PRIMARY = {
  url: NOCK_SEB_URL,
  primary: true,
  user: 'USER',
  pass: 'PASS',
};

function mockGlobFile(sandbox) {
  theHelper.mockGlob(sandbox, () => {
    return [ 'glob.file' ];
  });
}
function client() {
  return supertest(theApp);
}
function bodyIncludes(string, doesArg) {
  const does = doesArg || (doesArg === undefined);
  return (res) => {
    // "If the response is ok, it should return falsy"
    const text = (res.text || '');
    if (text.includes(string) === does) {
      return;
    }
    throw new Error([ 'does not include "', string, '"' ].join(''));
  };
}
function redirectsTo(route) {
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
    console.log('    (registering the Express app ...)'); // eslint-disable-line no-console
    this.timeout(30000); // eslint-disable-line no-invalid-this
  });
  afterEach(() => {
    sandbox.restore();

    theHelper.mockConfig();

    mockfs.restore();
    nock.cleanAll();
    mitm.disable();
  });


  it('has access to HTTP assets', () => {
    mockfs({ '/mock-fs': {
      'index.html': NO_DATA,
    } });

    return wwwRoot.willDetectFile('index.html')
    .then((exists) => {
      assert(exists);
    });
  });


  it('GET /status.cgi', () => {
    return client().get('/status.cgi')
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

    it('without headers', () => {
      return client().get('/404.cgi')
      .expect(404)
      .expect('content-type', /html/)
      .expect(bodyIncludes('<base href="http://localhost:3000">'))
      .expect(bodyIncludes('<title>Sleepbot Constructs:  404 Not Found</title>'))
      .expect(bodyIncludes('That\'s net-speak for "I can\'t find any information for":', false))
      .endAsync();
    });

    it('with headers', () => {
      return client().get('/404.cgi')
      .set('x-real-uri', 'REAL-URI')
      .expect(404)
      .expect('content-type', /html/)
      .expect(bodyIncludes('<title>Sleepbot Constructs:  404 Not Found</title>'))
      .expect(bodyIncludes('REAL-URI'))
      .endAsync();
    });
  });


  it('GET /cgi/animbot.cgi', () => {
    mockGlobFile(sandbox);

    return client().get('/cgi/animbot.cgi')
    .expect(302)
    .expect(redirectsTo('/images/animbot/glob.file'))
    .endAsync();
  });


  it('GET /ambience/cgi/listen.cgi', () => {
    return client().get('/ambience/cgi/listen.cgi')
    .expect(200)
    .expect('content-type', /x-scpls/)
    .expect(bodyIncludes('[playlist]'))
    .endAsync();
  });

  it('GET /ambience/cgi/7.cgi', () => {
    // mock data for `sebServerPrimary`
    theHelper.mockConfig({
      sebServers: [ NOCK_SEB_PRIMARY ],
    });

    // produces HTTP 404 unless everything matches
    const nocked = nock(NOCK_SEB_URL)
    .get('/7.html')
    .matchHeader('user-agent', /XML Getter/)
    .reply(200, NOCK_DATA);

    return client().get('/ambience/cgi/7.cgi')
    .expect(200)
    .expect('content-type', /html/)
    .expect(bodyIncludes(NOCK_DATA))
    .expect(() => {
      assert.ok(nocked.isDone());
    })
    .endAsync();
  });

  it('GET /ambience/cgi/viewxml.cgi', () => {
    // mock data for `sebServerPrimary`
    theHelper.mockConfig({
      sebServers: [ NOCK_SEB_PRIMARY ],
    });

    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication
    const authorization = Buffer.from('USER:PASS').toString('base64');

    // produces HTTP 404 unless everything matches
    const nocked = nock(NOCK_SEB_URL)
    .get('/admin.cgi')
    .query({ mode: 'viewxml' })
    .matchHeader('user-agent', /^XML Getter/)
    .matchHeader('authorization', `Basic ${ authorization }`)
    .reply(200, NOCK_DATA, {
      'www-authenticate': 'basic realm="Shoutcast Server"',
    });

    return client().get('/ambience/cgi/viewxml.cgi')
    .expect(200)
    .expect('content-type', /xml/)
    .expect(bodyIncludes(NOCK_DATA))
    .expect(() => {
      assert.ok(nocked.isDone());
    })
    .endAsync();
  });

  it('GET /ambience/cgi/imgpage.cgi', () => {
    return client().get('/ambience/cgi/imgpage.cgi')
    .expect(302)
    .expect(redirectsTo('/ambience'))
    .endAsync();
  });

  describe('GET /ambience/cgi/any_f.cgi', () => {
    it('without data', () => {
      mockfs({ '/mock-fs': {
        'ambience': { },
        'ambienceAnySample.ejs': theHelper.realEjs('ambienceAnySample.ejs'),
      } });

      return client().get('/ambience/cgi/any_f.cgi')
      .expect(500, JSON.stringify({
        name: 'Error',
        message: 'ENOENT, no such file or directory \'/mock-fs/ambience/any.txt\'',
      }))
      .expect('content-type', /json/)
      .endAsync();
    });

    it('with data', () => {
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

      return client().get('/ambience/cgi/any_f.cgi')
      .expect(200)
      .expect('content-type', /html/)
      .expect(bodyIncludes('<base href="http://localhost:3000">'))
      .expect(bodyIncludes('<title>Ambience by the Dice :: Ambience for the Masses</title>'))
      .expect(bodyIncludes('href="/ambience/album/stub'))
      .expect(bodyIncludes('quip<br />'))
      .endAsync();
    });
  });


  it('GET /critturs/cgi/anyaudio.cgi', () => {
    mockGlobFile(sandbox);

    return client().get('/critturs/cgi/anyaudio.cgi')
    .expect(302)
    .expect(redirectsTo('/critturs/mp2/glob.file'))
    .endAsync();
  });

  it('GET /critturs/cgi/critlogo.cgi', () => {
    mockGlobFile(sandbox);

    return client().get('/critturs/cgi/critlogo.cgi')
    .expect(302)
    .expect(redirectsTo('/critturs/images/logo/glob.file'))
    .endAsync();
  });


  it('GET /fucc/cgi/anyaudio.cgi', () => {
    mockGlobFile(sandbox);

    return client().get('/fucc/cgi/anyaudio.cgi')
    .expect(302)
    .expect(redirectsTo('/fucc/mpg/glob.file'))
    .endAsync();
  });

  describe('GET /fucc/cgi/schednow.cgi', () => {
    let date;
    beforeEach(() => {
      date = new Date();
    });

    it('without data', () => {
      mockfs({ '/mock-fs': {
        'fucc': { },
        'fuccSchedule.ejs': theHelper.realEjs('fuccSchedule.ejs'),
      } });

      return client().get('/fucc/cgi/schednow.cgi')
      .expect(500, JSON.stringify({
        name: 'Error',
        message: 'ENOENT, no such file or directory \'/mock-fs/fucc/showquip.txt\'',
      }))
      .expect('content-type', /json/)
      .endAsync();
    });

    it('with dead data', () => {
      mockfs({ '/mock-fs': {
        'fucc': {
          'dead.txt': 'DEAD',
          'showquip.txt': QUIP_DATA,
        },
        'fuccSchedule.ejs': theHelper.realEjs('fuccSchedule.ejs'),
      } });

      return client().get('/fucc/cgi/schednow.cgi')
      .expect(200)
      .expect('content-type', /html/)
      .expect(bodyIncludes('<TITLE>F.U.C.C Radio Now</TITLE>'))
      .expect(bodyIncludes('<!-- DEAD -->'))
      .expect(bodyIncludes('<FONT SIZE=+1>quip</FONT>', false))
      .endAsync();
    });

    it('with live data', () => {
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

      return client().get('/fucc/cgi/schednow.cgi')
      .expect(200)
      .expect('content-type', /html/)
      .expect(bodyIncludes('<TITLE>F.U.C.C Radio Now</TITLE>'))
      .expect(bodyIncludes('<!-- ON -->'))
      .expect(bodyIncludes('live1\nlive2\nlive3'))
      .expect(bodyIncludes('HREF="/fucc/file#anchor"', false)) // no title
      .expect(bodyIncludes('<FONT SIZE=+1>quip</FONT>'))
      .endAsync();
    });

    it('with show data', () => {
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

      return client().get('/fucc/cgi/schednow.cgi')
      .expect(200)
      .expect('content-type', /html/)
      .expect(bodyIncludes('<TITLE>F.U.C.C Radio Now</TITLE>'))
      .expect(bodyIncludes('<!-- ON -->'))
      .expect(bodyIncludes('show1\nshow2\nshow3'))
      .expect(bodyIncludes('HREF="/fucc/file#anchor">title</A>'))
      .expect(bodyIncludes('<FONT SIZE=+1>quip</FONT>'))
      .endAsync();
    });
  });


  it('GET /lookit/cgi/anyfoley.cgi', () => {
    mockGlobFile(sandbox);

    return client().get('/lookit/cgi/anyfoley.cgi')
    .expect(302)
    .expect(redirectsTo('/lookit/etc/glob.file'))
    .endAsync();
  });

  it('GET /lookit/cgi/anystory.cgi', () => {
    mockGlobFile(sandbox);

    mockfs({ '/mock-fs': {
      'lookit': {
        'story': {
          'glob.file': 'GLOB.FILE',
        }
      },
      'lookitAnyStory.ejs': theHelper.realEjs('lookitAnyStory.ejs'),
    } });

    return client().get('/lookit/cgi/anystory.cgi')
    .expect(200)
    .expect('content-type', /html/)
    .expect(bodyIncludes('<BASE HREF="http://localhost:3000">'))
    .expect(bodyIncludes('<TITLE>Lookit Tells You a Story</TITLE>'))
    .expect(bodyIncludes('<A HREF="/" TARGET="_top"><TT><B>Sleepbot Constructs</B></TT></A><BR>'))
    .expect(bodyIncludes('GLOB.FILE'))
    .endAsync();
  });

  describe('GET /lookit/cgi/imgfoley.cgi', () => {
    beforeEach(() => {
      mockfs({ '/mock-fs': {
        'lookitImgFoley.ejs': theHelper.realEjs('lookitImgFoley.ejs'),
      } });
    });

    it('without parameters', () => {
      return client().get('/lookit/cgi/imgfoley.cgi')
      .expect(200)
      .expect('content-type', /html/)
      .expect(bodyIncludes('<base href="http://localhost:3000">'))
      .expect(bodyIncludes('<title>d f o l e y   @   s l e e p b o t . c o m :: :: (image)</title>'))
      .expect(bodyIncludes('src="/images/shim_clear.gif" title="(image)"'))
      .endAsync();
    });

    it('with parameters', () => {
      return client().get('/lookit/cgi/imgfoley.cgi')
      .query({ title: 'TITLE', image: 'IMAGE' })
      .expect(200)
      .expect('content-type', /html/)
      .expect(bodyIncludes('<title>d f o l e y   @   s l e e p b o t . c o m :: :: TITLE</title>'))
      .expect(bodyIncludes('src="/lookit/images/dfoley/IMAGE" title="TITLE"'))
      .endAsync();
    });
  });

  describe('GET /morgan/cgi/morglay.cgi', () => {
    it('without data', () => {
      mockfs({ '/mock-fs': {
        'morgan': { },
        'morganLayout.ejs': theHelper.realEjs('morganLayout.ejs'),
      } });

      return client().get('/morgan/cgi/morglay.cgi')
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

      it('without parameters', () => {
        return client().get('/morgan/cgi/morglay.cgi')
        .expect(200)
        .expect('content-type', /html/)
        .expect(bodyIncludes('<TITLE>Morgan\'s Tarot:  '))
        .expect(bodyIncludes('<BASE HREF="http://localhost:3000">'))
        .expect(bodyIncludes('Your 3 cards'))
        .endAsync();
      });

      it('with parameters', () => {
        return client().get('/morgan/cgi/morglay.cgi')
        .query({ cards: 23 })
        .expect(200)
        .expect('content-type', /html/)
        .expect(bodyIncludes('<TITLE>Morgan\'s Tarot:  '))
        .expect(bodyIncludes('Your 5 cards')) // all we have is 5
        .expect(bodyIncludes('<A HREF="/morgan/card/one.html'))
        .expect(bodyIncludes('TITLE="TWO"'))
        .expect(bodyIncludes('ALT="THREE"'))
        .expect(bodyIncludes('window.status=\'FOUR\''))
        .expect(bodyIncludes('/morgan/images/card/five.gif'))
        .endAsync();
      });
    });
  });

  it('GET /morgan/cgi/morgpick.cgi', () => {
    mockGlobFile(sandbox);

    return client().get('/morgan/cgi/morgpick.cgi')
    .expect(302)
    .expect(redirectsTo('/morgan/card/glob.file'))
    .endAsync();
  });

  [
    '/morgan/index.cgi',
    '/morgan/index.derp',
    '/morgan/',
    '/morgan'
  ].forEach((route) => {
    it(('GET ' + route), () => {
      return client().get(route)
      .expect(302)
      .expect(redirectsTo('/morgan/index_p.html'))
      .endAsync();
    });
  });

  it('GET /morgan, with a cookie', () => {
    return client().get('/morgan')
    .set('cookie', 'morgan_config=flat')
    .expect(302)
    .expect(redirectsTo('/morgan/index_h.html'))
    .endAsync();
  });


  it('GET /WRLDtime/cgi/anyclock.cgi', () => {
    mockGlobFile(sandbox);

    return client().get('/WRLDtime/cgi/anyclock.cgi')
    .expect(302)
    .expect(redirectsTo('/WRLDtime/face/glob.file'))
    .endAsync();
  });

  it('GET /WRLDtime/cgi/utc.cgi', () => {
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

    return client().get('/WRLDtime/cgi/utc.cgi')
    // .expect(200)
    // .expect('content-type', /plain/)
    // .expect(bodyIncludes(NOCK_DATA))
    .expect(503)
    .expect(() => {
      assert.ok(ntpResponse.called);
      assert.ok(socketError);
      assert.ok(/The "err" argument must be of type number./.test(socketError.message), socketError.message);
    })
    .endAsync();
  });
});
