const express = require('express');

const config = require('../lib/config');
const redirectToRandomFile = require('../app/redirectToRandomFile');
const redirectTo = require('../app/redirectTo');


/**
 * #### Perl CGI scripts, re-written as [Express](https://npmjs.com/package/express) handlers under Node.js
 *
 * &nbsp;
 *
 * @namespace app
 */
const app = express();

app.enable('trust proxy');
app.enable('case sensitive');
app.disable('strict routing');
app.set('view engine', 'ejs');
app.set('views', config.get('viewsRoot'));


function setupEJS(ejs) {
    // ejs.filters.escapeQuote = function(value) {
    //     return (value || '').gsub('"', '&quot;');
    // };
    return ejs;
}
app.engine('ejs', setupEJS(require('ejs')).__express);
app.engine('md', require('marked-engine').__express);
app.engine('markdown', require('marked-engine').__express);

app.use(require('cookie-parser')());


// the CGI routes

app.route('/status.cgi').all(require('../app/status'));
app.route('/404.cgi').all(require('../app/http404'));


//   /cgi
/**
 * Redirects to a random Bot logo image for [Sleepbot Constructs](http://sleepbot.com/cgi/animbot.cgi)
 *
 * @see http://sleepbot.com/cgi/animbot.cgi
 * @see app.redirectToRandomFile
 * @member app.anyAnimBot
 */
app.route('/cgi/animbot.cgi').all(redirectToRandomFile(
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
app.route('/ambience/cgi/imgpage.cgi').all(redirectTo(
    '/ambience'
));
app.route('/ambience/cgi/any_f.cgi').all(require('../app/ambienceAnySample'));


//   /critturs
/**
 * Redirects to a random [MP2](https://en.wikipedia.org/wiki/MPEG-1_Audio_Layer_II) audio sample
 * for [The Senseless Existence of Critturs](http://sleepbot.com/critturs/cgi/anyaudio.cgi)
 *
 * @see http://sleepbot.com/critturs/cgi/anyaudio.cgi
 * @see app.redirectToRandomFile
 * @member app.anyCritturAudio
 */
app.route('/critturs/cgi/anyaudio.cgi').all(redirectToRandomFile(
    '/critturs/mp2', '*.mp2'
));
/**
 * Redirects to a random logo image
 * for [The Senseless Existence of Critturs](http://sleepbot.com/critturs/cgi/critlogo.cgi)
 *
 * @see http://sleepbot.com/critturs/cgi/critlogo.cgi
 * @see app.redirectToRandomFile
 * @member app.anyCritturLogo
 */
app.route('/critturs/cgi/critlogo.cgi').all(redirectToRandomFile(
    '/critturs/images/logo', '*.gif'
));


//   /fucc
/**
 * Redirects to a random [MP2](https://en.wikipedia.org/wiki/MPEG-1_Audio_Layer_II) promo audio sample
 * for [F.U.C.C Radio](http://sleepbot.com/fucc/cgi/anyaudio.cgi)
 *
 * @see http://sleepbot.com/fucc/cgi/anyaudio.cgi
 * @see app.redirectToRandomFile
 * @member app.anyFuccAudio
 */
app.route('/fucc/cgi/anyaudio.cgi').all(redirectToRandomFile(
    '/fucc/mpg', '*.mp2'
));
app.route('/fucc/cgi/schednow.cgi').all(require('../app/fuccSchedule'));


//   /lookit
/**
 * Redirects to a random [MP2](https://en.wikipedia.org/wiki/MPEG-1_Audio_Layer_II) voice sample
 * for [The Root of All Things Lookit](http://sleepbot.com/lookit/cgi/anyfoley.cgi)
 *
 * @see http://sleepbot.com/lookit/cgi/anyfoley.cgi
 * @see app.redirectToRandomFile
 * @member app.anyFoley
 */
app.route('/lookit/cgi/anyfoley.cgi').all(redirectToRandomFile(
    '/lookit/etc', '*.mp2'
));
app.route('/lookit/cgi/anystory.cgi').all(require('../app/lookitAnyStory'));
app.route('/lookit/cgi/imgfoley.cgi').all(require('../app/lookitImgFoley'));


//   /morgan
app.route('/morgan/cgi/morglay.cgi').all(require('../app/morganLayout'));
/**
 * Picks a random card page from [Morgan's Tarot](http://sleepbot.com/morgan/cgi/morgpick.cgi)
 *
 * @see http://sleepbot.com/lookit/cgi/anyfoley.cgi
 * @see app.redirectToRandomFile
 * @member app.anyMorgan
 */
app.route('/morgan/cgi/morgpick.cgi').all(redirectToRandomFile(
    '/morgan/card', '*.html'
));
app.route('/morgan/index.:format').all(require('../app/morganIndex'));
app.route('/morgan').all(require('../app/morganIndex'));


//   /WRLDtime
/**
 * Picks a random clock page from [WRLD.time](http://sleepbot.com/WRLDtime/cgi/anyclock.cgi)
 *
 * @see http://sleepbot.com/WRLDtime/cgi/anyclock.cgi
 * @see app.redirectToRandomFile
 * @member app.anyWRLDtimeClock
 */
app.route('/WRLDtime/cgi/anyclock.cgi').all(redirectToRandomFile(
    '/WRLDtime/face', '*.html'
));
app.route('/WRLDtime/cgi/utc.cgi').all(require('../app/WRLDtimeUTC'));

// all *real* misses get HTTP 404s
//   re-route them to 404.cgi in your httpd config


module.exports = app;
