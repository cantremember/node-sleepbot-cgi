'use strict';

var Promise = require('bluebird');
var theLib = require('../lib/index');


/**
 * Renders an `<img />` wrapper page for [The Root of All Things Lookit](
 *   http://sleepbot.com/lookit/cgi/imgfoley.cgi?title=Jonesie,+the+Groovepuss&image=jonesie.jpg
 * )
 *
 * &nbsp;
 *
 * @see http://sleepbot.com/lookit/cgi/imgfoley.cgi?title=Example
 * @function app.lookitImgFoley
 * @params {express.request} req
 * @params {express.response} res
 * @params {Function} cb a callback invoked to continue down the Express middleware pipeline
 * @returns {Promise<express.response>} a Promise resolving `res`
 */
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
