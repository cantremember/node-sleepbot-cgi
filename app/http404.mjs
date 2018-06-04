import Promise from 'bluebird';

import theLib from '../lib/index';


/**
 * HTTP 404 handler for [Sleepbot Constructs](http://sleepbot.com/404-not-found)
 *
 * &nbsp;
 *
 * @see http://sleepbot.com/404-not-found
 * @function app.http404
 * @params {express.request} req
 * @params {express.response} res
 * @params {Function} cb a callback invoked to continue down the Express middleware pipeline
 * @returns {Promise<express.response>} a Promise resolving `res`
 */
export default function handler(req, res, cb) {
  // from within a `bluebird` Promise
  return Promise.try(() => {
    return theLib.willRenderView(res, 'http404.ejs', {
      config: theLib.config,
      real_uri: req.headers['x-real-uri'],
    });
  })
  .then((body) => {
    // send and resolve
    res.status(404).send(body);
  })
  .return(res)
  .catch(cb);
}
