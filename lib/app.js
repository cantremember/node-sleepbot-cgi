'use strict';

var path = require('path');
var express = require('express');

/*
  express
    http://expressjs.com/4x/api.html
    http://flippinawesome.org/2014/04/07/the-basics-of-express-routes/
  render, etc.
    https://github.com/visionmedia/ejs
    https://github.com/jaredhanson/marked-engine
    https://github.com/mikeal/request
    https://github.com/wdavidw/node-csv
  TODO:
    https://github.com/expressjs/body-parser
    https://github.com/expressjs/cookie-parser
    https://github.com/expressjs/cookie-session
*/

var app = express();
var rootPath = path.resolve(path.join(__dirname, '..')); // relative to *me*

app.enable('trust proxy');
app.enable('case sensitive');
app.disable('strict routing');
app.set('view engine', 'ejs');
app.set('views', path.resolve(path.join(rootPath, 'views')));


function setupEJS(ejs) {
    // ejs.filters.escapeQuote = function(value) {
    //     return (value || '').gsub('"', '&quot;');
    // };
    return ejs;
};
app.engine('ejs', setupEJS(require('ejs')).__express);
app.engine('md', require('marked-engine').__express);
app.engine('markdown', require('marked-engine').__express);

app.use(require('cookie-parser')());


// the CGI routes

app.route('/status.cgi').all(require('../app/status'));
app.route('/404.cgi').all(require('../app/http404'));

//   /cgi
app.route('/cgi/animbot.cgi').all(require('../app/redirectToRandomFile')(
    '/images/animbot', '*.gif'
));

//   /ambience
//   /ambience/cgi/listen.cgi/listen.pls
//     CGI file interrupts path resolution
//     URI resolves as its filename past the final '/'
//     implemented it as such in nginx.conf
app.route('/ambience/cgi/listen.*').all(require('../app/sebPlaylist'));
app.route('/ambience/cgi/7.:format').all(require('../app/sebStatusHTML'));
app.route('/ambience/cgi/viewxml.:format').all(require('../app/sebStatusXML'));
app.route('/ambience/cgi/imgpage.cgi').all(require('../app/redirectTo')(
    '/ambience'
));
app.route('/ambience/cgi/any_f.cgi').all(require('../app/ambienceAnySample'));

//   /critturs
app.route('/critturs/cgi/anyaudio.cgi').all(require('../app/redirectToRandomFile')(
    '/critturs/mp2', '*.mp2'
));
app.route('/critturs/cgi/critlogo.cgi').all(require('../app/redirectToRandomFile')(
    '/critturs/images/logo', '*.gif'
));

//   /fucc
app.route('/fucc/cgi/anyaudio.cgi').all(require('../app/redirectToRandomFile')(
    '/fucc/mpg', '*.mp2'
));
app.route('/fucc/cgi/schednow.cgi').all(require('../app/fuccSchedule'));

//   /lookit
app.route('/lookit/cgi/anyfoley.cgi').all(require('../app/redirectToRandomFile')(
    '/lookit/etc', '*.mp2'
));
app.route('/lookit/cgi/anystory.cgi').all(require('../app/lookitAnyStory'));
app.route('/lookit/cgi/imgfoley.cgi').all(require('../app/lookitImgFoley'));

//   /morgan
app.route('/morgan/cgi/morglay.cgi').all(require('../app/morganLayout'));
app.route('/morgan/cgi/morgpick.cgi').all(require('../app/redirectToRandomFile')(
    '/morgan/card', '*.html'
));
app.route('/morgan/index.:format').all(require('../app/morganIndex'));
app.route('/morgan').all(require('../app/morganIndex'));

//   /WRLDtime
app.route('/WRLDtime/cgi/anyclock.cgi').all(require('../app/redirectToRandomFile')(
    '/WRLDtime/face', '*.html'
));
app.route('/WRLDtime/cgi/utc.cgi').all(require('../app/WRLDtimeUTC'));

// all *real* misses get HTTP 404s
//   re-route them to 404.cgi in your httpd config


module.exports = app;
