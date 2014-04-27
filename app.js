#!/usr/bin/env node
/*
   ENV
     NODE_ENV
     HTTP_PORT
     WWW_ROOT
   /etc/init.d
     https://github.com/nodejitsu/forever
*/

'use strict';

var path = require('path');
var theLib = require('./lib/index');


/*
    https://github.com/flatiron/nconf
    https://github.com/trentm/node-bunyan
        app.use(logger);
*/

// could from the command line
var params = (function() {
    var argv = process.argv;
    var i = argv.indexOf(__filename);
    var rest = argv.slice(i + 1);

    var minimist = require('minimist');
    return minimist(rest, {
        alias: { port: 'p' }
    });
})();

// could come from ENV
params.port = params.port || process.env['HTTP_PORT'];

// or from configuration
params.port = params.port || theLib.config.httpPort;

if (! params.port) {
    console.error(['Usage:  ', path.basename(__filename), ' --port <PORT>'].join(''));
    process.exit(1);
}

// expand upon configuration
theLib.config.wwwRoot = process.env['WWW_ROOT'] || theLib.config.wwwRoot;
console.log('WWW root is:', theLib.config.wwwRoot)

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

var express = require('express');
var app = express();
var viewPath = path.join(process.cwd(), 'views');

app.enable('trust proxy');
app.enable('case sensitive');
app.disable('strict routing');
app.set('view engine', 'ejs');
app.set('views', viewPath);

app.engine('ejs', theLib.setupEJS(require('ejs')).__express);
app.engine('md', require('marked-engine').__express);
app.engine('markdown', require('marked-engine').__express);


app.route('/status.cgi').all(require('./app/status'));
app.route('/404.cgi').all(require('./app/http404'));

app.route('/cgi/animbot.cgi').all(require('./app/redirectToRandomFile')('/images/animbot', '*.gif'));

// /ambience/cgi/listen.cgi/listen.pls
//   CGI file interrupts path resolution
//   URI resolves as its filename past the final '/'
app.route('/ambience/cgi/listen.*').all(require('./app/sebPlaylist'));
app.route('/ambience/cgi/7.:format').all(require('./app/sebStatusHTML'));
app.route('/ambience/cgi/viewxml.:format').all(require('./app/sebStatusXML'));
app.route('/ambience/cgi/imgpage.cgi').all(require('./app/redirectTo')('/ambience'));
app.route('/ambience/cgi/any_f.cgi').all(require('./app/ambienceAnySample'));

app.route('/critturs/cgi/anyaudio.cgi').all(require('./app/redirectToRandomFile')('/critturs/mp2', '*.mp2'));
app.route('/critturs/cgi/critlogo.cgi').all(require('./app/redirectToRandomFile')('/critturs/images/logo', '*.gif'));

app.route('/fucc/cgi/anyaudio.cgi').all(require('./app/redirectToRandomFile')('/fucc/mpg', '*.mp2'));
app.route('/fucc/cgi/schednow.cgi').all(require('./app/fuccSchedule'));


// all *real* misses get HTTP 404s
//   re-route them to 404.cgi in your httpd config

console.log('http port is:', params.port)
app.listen(params.port);


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
./lookit/cgi/anyfoley.cgi
./lookit/cgi/anystory.cgi
./lookit/cgi/imgfoley.cgi
./morgan/cgi/morglay.cgi
./morgan/cgi/morgpick.cgi
./morgan/index.cgi
./WRLDtime/cgi/anyclock.cgi
./WRLDtime/cgi/utc.cgi
*/
