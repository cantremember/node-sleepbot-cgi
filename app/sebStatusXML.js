'use strict';

var Promise = require('bluebird');
var request = Promise.promisify(require('request'));

// capture the app
module.exports = function(req, res, cb) {
    return request({
        uri: 'http://sc13.shoutcaststreaming.us:8194/admin.cgi?mode=viewxml',
        method: 'GET',
        headers: {
            'User-Agent': 'XML Getter (Mozilla Compatible)',
        },
        auth: {
            user: 'admin',
            pass: 'deepDeepSleep',
            sendImmediately: true,
        },
        followAllRedirects: true,
    }).spread(function(incoming, body) {
        res.set('Content-Type', 'text/xml');
        res.send(body);
    }).catch(cb).error(cb);
};
