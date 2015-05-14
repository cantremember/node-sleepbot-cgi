'use strict';

var Promise = require('bluebird');
var request = Promise.promisify(require('request'));

var theLib = require('../lib/index');
var sebServerPrimary = theLib.config.get('sebServerPrimary');


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
module.exports = function handler(req, res, cb) {
    return request({
        uri: (sebServerPrimary.url + '/admin.cgi?mode=viewxml'),
        method: 'GET',
        headers: {
            'User-Agent': 'XML Getter (Mozilla Compatible)',
        },
        auth: {
            user: sebServerPrimary.user,
            pass: sebServerPrimary.pass,
            sendImmediately: true,
        },
        followAllRedirects: true,
    })
    .spread(function(incoming, body) {
        res.set('Content-Type', 'text/xml').send(body);
    })
    .return(res)
    .catch(theLib.callbackAndThrowError(cb));
};
