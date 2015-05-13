'use strict';

var Promise = require('bluebird');
var request = Promise.promisify(require('request'));

var theLib = require('../lib/index');
var sebServerPrimary = theLib.config.get('sebServerPrimary');


// capture the app
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
        res.set('Content-Type', 'text/html');
        res.send(body);
    })
    .catch(theLib.callbackAndThrowError(cb));
};
