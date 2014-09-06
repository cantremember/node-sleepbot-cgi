'use strict';

var assert = require('assert');
var Promise = require('bluebird');
var supertest = require('supertest');
// https://github.com/doug-martin/super-request

supertest.Test.prototype.endAsync = Promise.promisify(supertest.Test.prototype.end);

var theLib = require('../../lib/index');
var theHelper = require('../helper');

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
    }
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
    }
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
    before(function() {
        console.log('    (the first test will take a moment ...)');
    });


    it('has access to HTTP assets', function() {
        assert(theLib.wwwRoot.hasFile('index.html'));
    });


    it('GET /status.cgi', function() {
        return client().get('/status.cgi')
            .expect(200)
            .expect('content-type', /json/)
            .endAsync()
        ;
    });
    it('GET /404.cgi', function() {
        return client().get('/404.cgi')
            .expect(200)
            .expect('content-type', /html/)
            .expect(bodyIncludes('<title>Sleepbot Constructs:  404 Not Found</title>'))
            .expect(bodyIncludes('That\'s net-speak for "I can\'t find any information for":', false))
            .endAsync()
        ;
    });
    it('GET /404.cgi, with headers', function() {
        return client().get('/404.cgi')
            .set('x-real-uri', 'REAL-URI')
            .expect(200)
            .expect('content-type', /html/)
            .expect(bodyIncludes('That\'s net-speak for "I can\'t find any information for":', true))
            .expect(bodyIncludes('REAL-URI'))
            .endAsync()
        ;
    });


    it('GET /cgi/animbot.cgi', function() {
        return client().get('/cgi/animbot.cgi')
            .expect(redirectsTo('/images/animbot/'))
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
    it('GET /ambience/cgi/any_f.cgi', function() {
        return client().get('/ambience/cgi/any_f.cgi')
            .expect(200)
            .expect('content-type', /html/)
            .expect(bodyIncludes('<title>Ambience by the Dice :: Ambience for the Masses</title>'))
            .expect(bodyIncludes('href="/ambience/album/'))
            .endAsync()
        ;
    });


    it('GET /critturs/cgi/anyaudio.cgi', function() {
        return client().get('/critturs/cgi/anyaudio.cgi')
            .expect(redirectsTo('/critturs/mp2/'))
            .endAsync()
        ;
    });
    it('GET /critturs/cgi/critlogo.cgi', function() {
        return client().get('/critturs/cgi/critlogo.cgi')
            .expect(redirectsTo('/critturs/images/logo/'))
            .endAsync()
        ;
    });


    it('GET /fucc/cgi/anyaudio.cgi', function() {
        return client().get('/fucc/cgi/anyaudio.cgi')
            .expect(redirectsTo('/fucc/mpg/'))
            .endAsync()
        ;
    });
    it('GET /fucc/cgi/schednow.cgi', function() {
        return client().get('/fucc/cgi/schednow.cgi')
            .expect(200)
            .expect('content-type', /html/)
            .expect(bodyIncludes('<TITLE>F.U.C.C Radio Now</TITLE>'))
            .endAsync()
        ;
    });


    it('GET /lookit/cgi/anyfoley.cgi', function() {
        return client().get('/lookit/cgi/anyfoley.cgi')
            .expect(redirectsTo('/lookit/etc/'))
            .endAsync()
        ;
    });
    it('GET /lookit/cgi/anystory.cgi', function() {
        return client().get('/lookit/cgi/anystory.cgi')
            .expect(200)
            .expect('content-type', /html/)
            .expect(bodyIncludes('<TITLE>Lookit Tells You a Story</TITLE>'))
            .expect(bodyIncludes('<A HREF="/" TARGET="_top"><TT><B>Sleepbot Constructs</B></TT></A><BR>'))
            .endAsync()
        ;
    });
    it('GET /lookit/cgi/imgfoley.cgi', function() {
        return client().get('/lookit/cgi/imgfoley.cgi')
            .expect(200)
            .expect('content-type', /html/)
            .expect(bodyIncludes('<title>d f o l e y   @   s l e e p b o t . c o m :: :: (image)</title>'))
            .expect(bodyIncludes('src="/images/shim_clear.gif" title="(image)"'))
            .endAsync()
        ;
    });
    it('GET /lookit/cgi/imgfoley.cgi, with parameters', function() {
        return client().get('/lookit/cgi/imgfoley.cgi?title=TITLE&image=IMAGE')
            .expect(200)
            .expect('content-type', /html/)
            .expect(bodyIncludes('<title>d f o l e y   @   s l e e p b o t . c o m :: :: TITLE</title>'))
            .expect(bodyIncludes('src="/lookit/images/dfoley/IMAGE" title="TITLE"'))
            .endAsync()
        ;
    });


    it('GET /morgan/cgi/morglay.cgi', function() {
        return client().get('/morgan/cgi/morglay.cgi')
            .expect(200)
            .expect('content-type', /html/)
            .expect(bodyIncludes('Your 3 cards'))
            .expect(bodyIncludes('<A HREF="/morgan/card/'))
            .endAsync()
        ;
    });
    it('GET /morgan/cgi/morglay.cgi, with parameters', function() {
        return client().get('/morgan/cgi/morglay.cgi?cards=23')
            .expect(200)
            .expect('content-type', /html/)
            .expect(bodyIncludes('Your 10 cards'))
            .expect(bodyIncludes('<A HREF="/morgan/card/'))
            .endAsync()
        ;
    });
    it('GET /morgan/cgi/morgpick.cgi', function() {
        return client().get('/morgan/cgi/morgpick.cgi')
            .expect(redirectsTo('/morgan/card/'))
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
    it('GET /morgan/morgan, with a cookie', function() {
        return client().get('/morgan/index.cgi')
            .set('cookie', 'morgan_config=flat')
            .expect(redirectsTo('/morgan/index_h.html'))
            .endAsync()
        ;
    });


    it('GET /WRLDtime/cgi/anyclock.cgi', function() {
        return client().get('/WRLDtime/cgi/anyclock.cgi')
            .expect(redirectsTo('/WRLDtime/face/'))
            .endAsync()
        ;
    });
    it('GET /WRLDtime/cgi/utc.cgi', function() {
        this.timeout(0);
        return client().get('/WRLDtime/cgi/utc.cgi')
            .expect(200)
            .expect('content-type', /html/)
            .expect(bodyIncludes('UTC(NIST)'))
            .endAsync()
        ;
    });
});
