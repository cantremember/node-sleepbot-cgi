'use strict';

var path = require('path');
var Promise = require('bluebird');
var theLib = require('../lib/index');


// capture file-path & optional glob pattern
module.exports = function handler(req, res, cb) {
    return Promise.resolve()
    .then(function(body) {
        var title = req.param('title') || '(image)';
        var image = req.param('image');
        image = (image
            ? ('/lookit/images/dfoley/' + image)
            : '/images/shim_clear.gif'
        );

        return Promise.promisify(res.render, res)('lookitImgFoley.ejs', {
            config: theLib.config,
            title: title,
            image: image,
        })
        .then(function(body) {
            res.send(body);
        });
    })
    .catch(theLib.callbackAndThrowError(cb));
};
