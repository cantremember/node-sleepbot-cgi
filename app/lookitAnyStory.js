'use strict';

var Promise = require('bluebird');
var theLib = require('../lib/index');


// the filenames
var willGetFilenames = theLib.willMemoize(function() {
    return theLib.wwwRoot.willGetFilenames('lookit/story/*.txt');
});

// the files themselves
var willGetFile = function(filepath) {
    var cache = handler.cache;
    var will = cache[filepath] || theLib.willMemoize(function() {
        return theLib.wwwRoot.willLoadFile(filepath);
    });
    if (theLib.config.get('caching')) {
        // cache
        cache[filepath] = will;
    }
    // execute to produce a Promise
    return will();
};


/**
 * Renders a random story from [The Root of All Things Lookit](http://sleepbot.com/lookit/cgi/anystory.cgi)
 *
 * &nbsp;
 *
 * @see http://sleepbot.com/lookit/cgi/anystory.cgi
 * @function app.lookitAnyStory
 * @params {express.request} req
 * @params {express.response} res
 * @params {Function} cb a callback invoked to continue down the Express middleware pipeline
 * @returns {Promise<express.response>} a Promise resolving `res`
 */
function handler(req, res, cb) {
    return willGetFilenames()
    .then(function(filenames) {
        var filepath = theLib.chooseAny(filenames);

        return willGetFile('lookit/story/' + filepath);
    })
    .then(function(body) {
        return Promise.promisify(res.render, res)('lookitAnyStory.ejs', {
            config: theLib.config,
            body: body,
        })
        .then(function(body) {
            res.send(body);
        });
    })
    .return(res)
    .catch(theLib.callbackAndThrowError(cb));
}

/**
 * Flushes the cache
 *
 * @memberof app.lookitAnyStory
 * @function forget
 */
handler.forget = function forget() {
    this.cache = {};
};
handler.forget();


module.exports = handler;
