import express from 'express';
import ejs from 'ejs';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import _ from 'lodash';

import config from '../lib/config';
import redirectToRandomFile from '../app/redirectToRandomFile';
import redirectTo from '../app/redirectTo';

import routeStatus from '../app/status';
import routeHttp404 from '../app/http404';
import routeSebPlaylist from '../app/sebPlaylist';
import routeSebStatusHTML from '../app/sebStatusHTML';
import routeSebStatusXML from '../app/sebStatusXML';
import routeAmbienceAnySample from '../app/ambienceAnySample';
import routeFuccSchedule from '../app/fuccSchedule';
import routeLookitAnyStory from '../app/lookitAnyStory';
import routeLookitImgFoley from '../app/lookitImgFoley';
import routeMorganLayout from '../app/morganLayout';
import routeMorganIndex from '../app/morganIndex';
import routeWRLDtimeUTC from '../app/WRLDtimeUTC';


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


function setupEJS(engine) {
  // engine.filters.escapeQuote = function(value) {
  //     return (value || '').gsub('"', '&quot;');
  // };
  return engine;
}
app.engine('ejs', setupEJS(ejs).__express);


// before routes

// https://www.npmjs.com/package/morgan#tiny
//   ':method :url :status :res[content-length] - :response-time ms'
app.use(morgan(':date[iso] - :method :url :status :res[content-length] - :response-time ms'));

app.use(cookieParser()); // Cookie:

app.use((req, res, next) => {
  const payload = {
    // a snapshot taken *before* the route executes;
    //   whatever went bad happened in between this log and the last.
    //   if we do that, we can avoid cleverness
    now: (new Date()).toISOString(),
    mem: process.memoryUsage(),
    originalUrl: req.originalUrl,
    body: req.body,
  };
  console.log(JSON.stringify(payload));

  next();
});

// the CGI routes

app.route('/status.cgi').all(routeStatus);
app.route('/404.cgi').all(routeHttp404);


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
app.route('/ambience/cgi/listen.*').all(routeSebPlaylist);
app.route('/ambience/cgi/7.:format').all(routeSebStatusHTML);
app.route('/ambience/cgi/viewxml.:format').all(routeSebStatusXML);
app.route('/ambience/cgi/imgpage.cgi').all(redirectTo(
  '/ambience'
));
app.route('/ambience/cgi/any_f.cgi').all(routeAmbienceAnySample);


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
app.route('/fucc/cgi/schednow.cgi').all(routeFuccSchedule);


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
app.route('/lookit/cgi/anystory.cgi').all(routeLookitAnyStory);
app.route('/lookit/cgi/imgfoley.cgi').all(routeLookitImgFoley);


//   /morgan
app.route('/morgan/cgi/morglay.cgi').all(routeMorganLayout);
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
app.route('/morgan/index.:format').all(routeMorganIndex);
app.route('/morgan').all(routeMorganIndex);


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
app.route('/WRLDtime/cgi/utc.cgi').all(routeWRLDtimeUTC);

// all *real* misses get HTTP 404s
//   re-route them to 404.cgi in your httpd config


// after routes

export function logError(err, req, res, next) {
  if (! err) {
    next();
    return;
  }
  console.error(err.stack || /* istanbul ignore next */ err); // eslint-disable-line no-console

  const json = _.pick(err, 'name', 'message');
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json(json);
}
app.use(logError);


export default app;
