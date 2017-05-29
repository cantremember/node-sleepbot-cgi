const Promise = require('bluebird');

const theLib = require('../lib/index');


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
module.exports = function handler(req, res, cb) {
    return Promise.resolve()
    .then(() => {
        // from within an established Promise
        return Promise.promisify(res.render, {
            context: res,
        })('http404.ejs', {
            config: theLib.config,
            real_uri: req.headers['x-real-uri'],
        })
        .then((body) => {
            // send and resolve
            res.send(body, 404);
        });
    })
    .return(res)
    .catch(cb);
};
