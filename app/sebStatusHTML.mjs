import axios from 'axios';

import theLib from '../lib/index.mjs';


/**
 * Proxies the Shoutcast 'Current Status' HTML page
 * for [Sleepbot Environmental Broadcast](http://sleepbot.com/ambience/cgi/7.html)
 *
 * &nbsp;
 *
 * @see http://sleepbot.com/ambience/cgi/7.cgi
 * @function app.sebStatusHTML
 * @params {express.request} req
 * @params {express.response} res
 * @params {Function} next a callback invoked to continue down the Express middleware pipeline
 * @returns {Promise<express.response>} a Promise resolving `res`
 */
export default async function middleware(req, res, next) {
  const { sebServerPrimary } = theLib;
  const url = `${ sebServerPrimary.serverUrl }/7.html`;

  try {
    const response = await axios.request({
      method: 'GET',
      url,
      headers: {
        'User-Agent': 'XML Getter (Mozilla Compatible)', // <= yeah, it's important
      },
      auth: {
        username: sebServerPrimary.user,
        password: sebServerPrimary.pass,
      },
      maxRedirects: 1,
    });

    const { data } = response;
    res
    .set('Content-Type', 'text/html')
    .status(200)
    .send(data);

    return res;
  }
  catch (err) {
    next(err);
    return res;
  }
}
