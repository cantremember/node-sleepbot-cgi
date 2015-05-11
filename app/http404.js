'use strict';

var Promise = require('bluebird');
var theLib = require('../lib/index');

module.exports = function handler(req, res, cb) {
    return Promise.resolve()
    .then(function() {
        // from within an established Promise
        return Promise.promisify(res.render, res)('http404.ejs', {
            config: theLib.config,
            real_uri: req.headers['x-real-uri'],
        })
        .then(function(body) {
            // send and resolve
            res.send(body);
        });
    })
    .catch(theLib.callbackAndThrowError(cb));
};
