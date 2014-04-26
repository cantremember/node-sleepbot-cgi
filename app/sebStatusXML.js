'use strict';

var Promise = require('bluebird');
var request = Promise.promisify(require('request'));

var theLib = require('../lib/index');
var sebServerPrimary = theLib.config.get('sebServerPrimary');

// capture the app
module.exports = function(req, res, cb) {
    return request({
        uri: (sebServerPrimary.url + '/admin.cgi?mode=viewxml'),
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
