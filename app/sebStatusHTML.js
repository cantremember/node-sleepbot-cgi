'use strict';

var Promise = require('bluebird');
var request = Promise.promisify(require('request'));

var theLib = require('../lib/index');
var sebServerPrimary = theLib.config.get('sebServerPrimary');


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
module.exports = function handler(req, res, cb) {
    return request({
        uri: (sebServerPrimary.url + '/7.html'),
        method: 'GET',
        headers: {
            'User-Agent': 'XML Getter (Mozilla Compatible)',
        },
        followAllRedirects: true,
    })
    .spread(function(incoming, body) {
        res.set('Content-Type', 'text/html').send(body);
    })
    .return(res)
    .catch(theLib.callbackAndThrowError(cb));
};
