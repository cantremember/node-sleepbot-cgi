'use strict';

var assert = require('assert');
var sinon = require('sinon');
var mockfs = require('mock-fs');
var Promise = require('bluebird');
var supertest = require('supertest');
// https://github.com/doug-martin/super-request

supertest.Test.prototype.endAsync = Promise.promisify(supertest.Test.prototype.end);

var theLib = require('../../lib/index');
var theHelper = require('../helper');

var NO_DATA = new Buffer(0);
var QUIP_DATA = '\n\
text\n\
quip\n\
';

function mockGlobFile(sandbox) {
    theHelper.mockGlob(sandbox, function() {
        return [ 'glob.file' ];
    });
}
function client() {
    return supertest(theLib.app);
}
function bodyIncludes(string, does) {
    does = does || (does === undefined);
    return function(res) {
        // "If the response is ok, it should return falsy"
        return (
            (((res.text || '').indexOf(string) === -1) === does) &&
            [ 'does not include "', string, '"' ].join('')
        );
    };
}
function redirectsTo(route) {
    return function(res) {
        // "If the response is ok, it should return falsy"
        if (res.statusCode !== 302) {
            return 'does not redirect';
        }
        var absolute = [ theLib.config.baseURL, route ].join('');
        return (
            ((res.headers['location'] || '').indexOf(absolute) !== 0) &&
            [ 'does not redirect to "', route, '"' ].join('')
        );
    };
}

/*
curl -v http://localhost:3000/status.cgi
curl -v http://localhost:3000/404.cgi
curl -v http://localhost:3000/cgi/animbot.cgi
curl -v http://localhost:3000/ambience/cgi/listen.cgi
curl -v http://localhost:3000/ambience/cgi/7.cgi
curl -v http://localhost:3000/ambience/cgi/viewxml.cgi
curl -v http://localhost:3000/ambience/cgi/imgpage.cgi
curl -v http://localhost:3000/ambience/cgi/any_f.cgi
curl -v http://localhost:3000/critturs/cgi/anyaudio.cgi
curl -v http://localhost:3000/critturs/cgi/critlogo.cgi
curl -v http://localhost:3000/fucc/cgi/anyaudio.cgi
curl -v http://localhost:3000/fucc/cgi/schednow.cgi
curl -v http://localhost:3000/lookit/cgi/anyfoley.cgi
curl -v http://localhost:3000/lookit/cgi/anystory.cgi
curl -v http://localhost:3000/lookit/cgi/imgfoley.cgi
curl -v http://localhost:3000/morgan/cgi/morglay.cgi
curl -v http://localhost:3000/morgan/cgi/morgpick.cgi
curl -v http://localhost:3000/morgan/index.cgi
curl -v http://localhost:3000/morgan/index.derp
curl -v http://localhost:3000/morgan/
curl -v http://localhost:3000/morgan
curl -v http://localhost:3000/WRLDtime/cgi/anyclock.cgi
curl -v http://localhost:3000/WRLDtime/cgi/utc.cgi
*/


describe('app', function() {
    var sandbox;
    before(function() {
        // explicity load the App up-front;
        //   it'll take a few moments, even if we let it happen 'naturally',
        //   but we do it manually, to ensure mock-fs will not affect App loading
        console.log('    (registering the Express app ...)');
        return theLib.app;
    });
    beforeEach(function() {
        // own own private sandbox
        sandbox = sinon.sandbox.create();
    });
    afterEach(function() {
        sandbox.restore();
        mockfs.restore();
    });


    it('has access to HTTP assets', function() {
        mockfs({ '/mock-fs': {
            'index.html': NO_DATA,
        } });

        return theLib.wwwRoot.willDetectFile('index.html')
        .then(function(exists) {
            assert(exists);
        });
    });


    it('GET /status.cgi', function() {
        return client().get('/status.cgi')
            .expect(200)
            .expect('content-type', /json/)
            .endAsync()
        ;
    });

    describe('GET /404.cgi', function() {
        beforeEach(function() {
            mockfs({ '/mock-fs': {
                'http404.ejs': theHelper.realEjs('http404.ejs'),
            } });
        });

        it('without headers', function() {
            return client().get('/404.cgi')
                .expect(200)
                .expect('content-type', /html/)
                .expect(bodyIncludes('<title>Sleepbot Constructs:  404 Not Found</title>'))
                .expect(bodyIncludes('That\'s net-speak for "I can\'t find any information for":', false))
                .endAsync()
            ;
        });

        it('with headers', function() {
            return client().get('/404.cgi')
                .set('x-real-uri', 'REAL-URI')
                .expect(200)
                .expect('content-type', /html/)
                .expect(bodyIncludes('That\'s net-speak for "I can\'t find any information for":', true))
                .expect(bodyIncludes('REAL-URI'))
                .endAsync()
            ;
        });
    });


    it('GET /cgi/animbot.cgi', function() {
        mockGlobFile(sandbox);

        return client().get('/cgi/animbot.cgi')
            .expect(redirectsTo('/images/animbot/glob.file'))
            .endAsync()
        ;
    });


    it('GET /ambience/cgi/listen.cgi', function() {
        return client().get('/ambience/cgi/listen.cgi')
            .expect(200)
            .expect('content-type', /x-scpls/)
            .expect(bodyIncludes('[playlist]'))
            .endAsync()
        ;
    });

    it('GET /ambience/cgi/viewxml.cgi', function() {
        return client().get('/ambience/cgi/viewxml.cgi')
            .expect(200)
            .expect('content-type', /xml/)
            .expect(bodyIncludes('<!DOCTYPE SHOUTCASTSERVER'))
            .endAsync()
        ;
    });

    it('GET /ambience/cgi/imgpage.cgi', function() {
        return client().get('/ambience/cgi/imgpage.cgi')
            .expect(redirectsTo('/ambience'))
            .endAsync()
        ;
    });

    describe('GET /ambience/cgi/any_f.cgi', function() {
        it('without data', function() {
            return client().get('/ambience/cgi/any_f.cgi')
                .expect(404)
                .expect('content-type', /html/)
                .endAsync()
            ;
        });

        it('with data', function() {
            mockfs({ '/mock-fs': {
                'ambience': {
                    'any.txt': '\n\
file\text\tpage\tstub\tartist\talbum\ttrack\tsize\n\
file\text\tpage\tstub\tartist\talbum\ttrack\tsize\n\
',
                    'anyquip.txt': QUIP_DATA,
                },
                'ambienceAnySample.ejs': theHelper.realEjs('ambienceAnySample.ejs'),
            } });

            return client().get('/ambience/cgi/any_f.cgi')
                .expect(200)
                .expect('content-type', /html/)
                .expect(bodyIncludes('<title>Ambience by the Dice :: Ambience for the Masses</title>'))
                .expect(bodyIncludes('href="/ambience/album/stub'))
                .expect(bodyIncludes('quip<br />'))
                .endAsync()
            ;
        });
    });


    it('GET /critturs/cgi/anyaudio.cgi', function() {
        mockGlobFile(sandbox);

        return client().get('/critturs/cgi/anyaudio.cgi')
            .expect(redirectsTo('/critturs/mp2/glob.file'))
            .endAsync()
        ;
    });

    it('GET /critturs/cgi/critlogo.cgi', function() {
        mockGlobFile(sandbox);

        return client().get('/critturs/cgi/critlogo.cgi')
            .expect(redirectsTo('/critturs/images/logo/glob.file'))
            .endAsync()
        ;
    });


    it('GET /fucc/cgi/anyaudio.cgi', function() {
        mockGlobFile(sandbox);

        return client().get('/fucc/cgi/anyaudio.cgi')
            .expect(redirectsTo('/fucc/mpg/glob.file'))
            .endAsync()
        ;
    });

    describe('GET /fucc/cgi/schednow.cgi', function() {
        var date;
        beforeEach(function() {
            date = new Date();
        });

        it('without data', function() {
            mockfs({ '/mock-fs': {
                'fucc': { },
                'fuccSchedule.ejs': theHelper.realEjs('fuccSchedule.ejs'),
            } });

            return client().get('/fucc/cgi/schednow.cgi')
                .expect(200)
                .expect('content-type', /html/)
                .expect(bodyIncludes('<TITLE>F.U.C.C Radio Now</TITLE>'))
                .expect(bodyIncludes('<!-- OFF -->'))
                .endAsync()
            ;
        });

        it('with dead data', function() {
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
                .endAsync()
            ;
        });

        it('with live data', function() {
            mockfs({ '/mock-fs': {
                'fucc': {
                    'live.txt': '\
file\tanchor\tyear\tmonth\tday\thourStart\thourEnd\n\
file\tanchor\t' +
    date.getYear() + '\t' + date.getMonth() + '\t' + date.getDate() + '\t' +
    date.getHours() + '\t' + (date.getHours() + 1) + '\n\
',
                    'live.html': '\
<A NAME="anchor">\n\
live1\n\
live2\n\
live3\n\
',
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
                .endAsync()
            ;
        });

        it('with show data', function() {
            mockfs({ '/mock-fs': {
                'fucc': {
                    'show.txt': '\
file\tanchor\tyear\tmonth\tday\thourStart\thourEnd\n\
file\tanchor\t' +
    date.getDay() + '\t' + date.getHours() + '\t' + (date.getHours() + 1) + '\n\
',
                    'show.html': '\
<A NAME="anchor">\n\
show1\n\
show2\n\
<!-- start -->\n\
title\n\
show3\n\
<!-- end -->\n\
',
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
                .endAsync()
            ;
        });
    });


    it('GET /lookit/cgi/anyfoley.cgi', function() {
        mockGlobFile(sandbox);

        return client().get('/lookit/cgi/anyfoley.cgi')
            .expect(redirectsTo('/lookit/etc/glob.file'))
            .endAsync()
        ;
    });

    it('GET /lookit/cgi/anystory.cgi', function() {
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
            .expect(bodyIncludes('<TITLE>Lookit Tells You a Story</TITLE>'))
            .expect(bodyIncludes('<A HREF="/" TARGET="_top"><TT><B>Sleepbot Constructs</B></TT></A><BR>'))
            .expect(bodyIncludes('GLOB.FILE'))
            .endAsync()
        ;
    });

    describe('GET /lookit/cgi/imgfoley.cgi', function() {
        beforeEach(function() {
            mockfs({ '/mock-fs': {
                'lookitImgFoley.ejs': theHelper.realEjs('lookitImgFoley.ejs'),
            } });
        });

        it('without parameters', function() {
            return client().get('/lookit/cgi/imgfoley.cgi')
                .expect(200)
                .expect('content-type', /html/)
                .expect(bodyIncludes('<title>d f o l e y   @   s l e e p b o t . c o m :: :: (image)</title>'))
                .expect(bodyIncludes('src="/images/shim_clear.gif" title="(image)"'))
                .endAsync()
            ;
        });

        it('with parameters', function() {
            return client().get('/lookit/cgi/imgfoley.cgi?title=TITLE&image=IMAGE')
                .expect(200)
                .expect('content-type', /html/)
                .expect(bodyIncludes('<title>d f o l e y   @   s l e e p b o t . c o m :: :: TITLE</title>'))
                .expect(bodyIncludes('src="/lookit/images/dfoley/IMAGE" title="TITLE"'))
                .endAsync()
            ;
        });
    });

    describe('GET /morgan/cgi/morglay.cgi', function() {
        beforeEach(function() {
            mockfs({ '/mock-fs': {
                'morgan': {
                    'card.txt': '\
id\tabbrev\ttitle\n\
1\tone\tONE\n\
2\ttwo\tTWO\n\
3\tthree\tTHREE\n\
4\tfour\tFOUR\n\
5\tfive\tFIVE\n\
',
                },
                'morganLayout.ejs': theHelper.realEjs('morganLayout.ejs'),
            } });
        });

        it('without parameters', function() {
            return client().get('/morgan/cgi/morglay.cgi')
                .expect(200)
                .expect('content-type', /html/)
                .expect(bodyIncludes('Your 3 cards'))
                .endAsync()
            ;
        });

        it('with parameters', function() {
            return client().get('/morgan/cgi/morglay.cgi?cards=23')
                .expect(200)
                .expect('content-type', /html/)
                .expect(bodyIncludes('Your 5 cards')) // all we have is 5
                .expect(bodyIncludes('<A HREF="/morgan/card/one.html'))
                .expect(bodyIncludes('TITLE="TWO"'))
                .expect(bodyIncludes('ALT="THREE"'))
                .expect(bodyIncludes('window.status=\'FOUR\''))
                .expect(bodyIncludes('/morgan/images/card/five.gif'))
                .endAsync()
            ;
        });
    });

    it('GET /morgan/cgi/morgpick.cgi', function() {
        mockGlobFile(sandbox);

        return client().get('/morgan/cgi/morgpick.cgi')
            .expect(redirectsTo('/morgan/card/glob.file'))
            .endAsync()
        ;
    });

    [
        '/morgan/index.cgi',
        '/morgan/index.derp',
        '/morgan/',
        '/morgan'
    ].forEach(function(route) {
        it(('GET ' + route), function() {
            return client().get(route)
                .expect(redirectsTo('/morgan/index_p.html'))
                .endAsync()
            ;
        });
    });

    it('GET /morgan, with a cookie', function() {
        return client().get('/morgan')
            .set('cookie', 'morgan_config=flat')
            .expect(redirectsTo('/morgan/index_h.html'))
            .endAsync()
        ;
    });


    it('GET /WRLDtime/cgi/anyclock.cgi', function() {
        mockGlobFile(sandbox);

        return client().get('/WRLDtime/cgi/anyclock.cgi')
            .expect(redirectsTo('/WRLDtime/face/glob.file'))
            .endAsync()
        ;
    });

    it('GET /WRLDtime/cgi/utc.cgi', function() {
        this.timeout(5000);

        return client().get('/WRLDtime/cgi/utc.cgi')
            .expect(200)
            .expect('content-type', /html/)
            .expect(bodyIncludes('UTC(NIST)'))
            .endAsync()
        ;
    });
});
