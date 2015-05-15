'use strict';

const theLib = require('../lib/index');


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
 * @params {Function} cb a callback invoked to continue down the Express middleware pipeline
 * @returns {Promise<express.response>} a Promise resolving `res`
 */
module.exports = function handler(req, res) {
    // the appropriate index file
    const config = req.cookies['morgan_config'];
    const route = ((config === 'flat')
        ? '/morgan/index_h.html'
        : '/morgan/index_p.html'
    );

    res.redirect(theLib.baseURL(route));
};
