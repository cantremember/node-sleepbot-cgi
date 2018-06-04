import Promise from 'bluebird';
import axios from 'axios';

import theLib from '../lib/index';


/**
 * Proxies the Shoutcast ['Get XML Stats'](
 *   http://wiki.shoutcast.com/wiki/SHOUTcast_DNAS_Server_2_XML_Reponses
 * ) Document for [Sleepbot Environmental Broadcast](http://sleepbot.com/ambience/cgi/viewxml.cgi)
 *
 * &nbsp;
 *
 * @see http://sleepbot.com/ambience/cgi/viewxml.cgi
 * @function app.sebStatusXML
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
      url: (sebServerPrimary.url + '/admin.cgi?mode=viewxml'),
      headers: {
        'User-Agent': 'XML Getter (Mozilla Compatible)', // <= yeah, it's important
      },
      auth: {
        username: sebServerPrimary.user,
        password: sebServerPrimary.pass,
      },
      maxRedirects: 1,
    });
  })
  .then((response) => {
    const { data } = response;

    res.set('Content-Type', 'text/xml').send(data);
  })
  .return(res)
  .catch(cb);
}
