#!/usr/bin/env node
// https://github.com/nodejitsu/forever

var path = require('path');
var appLib = require(path.join(__dirname, 'app/index'));

// https://github.com/flatiron/nconf
// https://github.com/trentm/node-bunyan
//   app.use(logger);

var params = (function() {
    var argv = process.argv;
    var i = argv.indexOf(__filename);
    var rest = argv.slice(i + 1);

    var minimist = require('minimist');
    return minimist(rest, {
        alias: { port: 'p' }
    });
})();

if (! params.port) {
    console.error(['Usage:  ', path.basename(__filename), ' --port <PORT>'].join(''));
    process.exit(1);
}

// http://expressjs.com/4x/api.html
// http://flippinawesome.org/2014/04/07/the-basics-of-express-routes/
// https://github.com/visionmedia/ejs
// https://github.com/jaredhanson/marked-engine
// TODO:
//   https://github.com/expressjs/body-parser
//   https://github.com/expressjs/cookie-parser
//   https://github.com/expressjs/cookie-session

var express = require('express');
var app = express();
var viewPath = path.join(process.cwd(), 'views');

app.enable('trust proxy');
app.enable('case sensitive');
app.disable('strict routing');
app.set('view engine', 'ejs');
app.set('views', viewPath);

app.engine('ejs', require('ejs').__express);
app.engine('md', require('marked-engine').__express);
app.engine('markdown', require('marked-engine').__express);

app.route('/status.cgi').all(appLib.status(app));
app.route('/404.cgi').all(appLib.http404(app));
// /ambience/cgi/listen.cgi/listen.pls
//   CGI file interrupts path resolution
//   URI resolves as its filename past the final '/'
app.route(/^\/ambience\/cgi\/listen.cgi(?:|\/.*)$/).all(appLib.sebPlaylist(app));

// all *real* misses get HTTP 404s
//   re-route them to 404.cgi in your httpd config
app.route('/derp').all(appLib.derp(app));

app.listen(params.port);

/*
./ambience/cgi/7-cgi
./ambience/cgi/any_f.cgi
./ambience/cgi/imgpage.cgi
./ambience/cgi/viewxml-fetch.cgi
./cgi/animbot.cgi
./cgi/cgi-lib.pl
./cgi/log.cgi
./critturs/cgi/anyaudio.cgi
./critturs/cgi/critlogo.cgi
./dfoley/index.cgi
./drummond/realaudio/index.cgi
./fucc/cgi/anyaudio.cgi
./fucc/cgi/schednow.cgi
./lookit/cgi/anyfoley.cgi
./lookit/cgi/anystory.cgi
./lookit/cgi/imgfoley.cgi
./morgan/cgi/morglay.cgi
./morgan/cgi/morgpick.cgi
./morgan/index.cgi
./WRLDtime/cgi/anyclock.cgi
./WRLDtime/cgi/utc.cgi
*/
