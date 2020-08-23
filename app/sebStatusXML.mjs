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
 * @params {Function} next a callback invoked to continue down the Express middleware pipeline
 * @returns {Promise<express.response>} a Promise resolving `res`
 */
export default async function middleware(req, res, next) {
  const { sebServerPrimary } = theLib;

  try {
    const response = await axios.request({
      method: 'GET',
      url: (sebServerPrimary.url + '/statistics'),
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
    .set('Content-Type', 'text/xml')
    .status(200)
    .send(data);

    return res;
  }
  catch (err) {
    next(err);
    return res;
  }
}
