import theLib from '../lib/index.mjs';


/**
 * HTTP 404 middleware for [Sleepbot Constructs](http://sleepbot.com/404-not-found)
 *
 * &nbsp;
 *
 * @see http://sleepbot.com/404-not-found
 * @function app.http404
 * @params {express.request} req
 * @params {express.response} res
 * @params {Function} next a callback invoked to continue down the Express middleware pipeline
 * @returns {Promise<express.response>} a Promise resolving `res`
 */
export default async function middleware(req, res, next) {
  try {
    const body = await theLib.willRenderView(res, 'http404.ejs', {
      config: theLib.config,
      real_uri: req.headers['x-real-uri'],
    });
    res.status(404).send(body);

    return res;
  }
  catch (err) {
    next(err);
    return res;
  }
}

