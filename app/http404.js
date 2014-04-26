'use strict';

var Promise = require('bluebird');
var theLib = require('../lib/index');

module.exports = function handler(req, res, cb) {
    return Promise.promisify(res.render, res)('http404.ejs', {
        config: theLib.config,
        real_uri: req.headers['x-real-uri'],
    }).then(function(body) {
        res.send(body);
    }).catch(cb).error(cb);
};
