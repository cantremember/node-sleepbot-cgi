import Promise from 'bluebird';
import axios from 'axios';

import theLib from '../lib/index';


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
 * @params {Function} cb a callback invoked to continue down the Express middleware pipeline
 * @returns {Promise<express.response>} a Promise resolving `res`
 */
export default function handler(req, res, cb) {
  const { sebServerPrimary } = theLib;

  // from within a `bluebird` Promise
  return Promise.try(() => {
    return axios.request({
      method: 'GET',
      url: (sebServerPrimary.url + '/7.html'),
      headers: {
        'User-Agent': 'XML Getter (Mozilla Compatible)', // <= yeah, it's important
      },
      maxRedirects: 1,
    });
  })
  .then((response) => {
    const { data } = response;

    res.set('Content-Type', 'text/html').send(data);
  })
  .return(res)
  .catch(cb);
}

