'use strict';

var Promise = require('bluebird');
var theLib = require('../lib/index');


// capture file-path & optional glob pattern
module.exports = function handler(req, res, cb) {
    return Promise.resolve()
    .then(function() {
        var title = req.query.title || '(image)';
        var image = req.query.image;
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
    .return(res)
    .catch(theLib.callbackAndThrowError(cb));
};
