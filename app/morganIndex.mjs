import theLib from '../lib/index.mjs';

const COOKIE_NAME = 'morgan_config';
const ROUTE_FLAT = 'flat';


/**
 * Displays the stand-alone or `<frameset />`-based homepage of [Morgan's Tarot](http://sleepbot.com/morgan)
 *
 * &nbsp;
 *
 * @see http://sleepbot.com/morgan/index.cgi
 * @see http://sleepbot.com/morgan/
 * @see http://sleepbot.com/morgan
 * @function app.morganIndex
 * @params {express.request} req
 * @params {express.response} res
 * @returns {Promise<express.response>} a Promise resolving `res`
 */
export default function middleware(req, res) {
  // the appropriate index file
  const config = req.cookies[COOKIE_NAME];
  const route = ((config === ROUTE_FLAT)
    ? '/morgan/index_h.html' // "header", no footer
    : '/morgan/index_p.html' // "parent" of header + footer
  );

  res.redirect(theLib.baseURL(route));
}
