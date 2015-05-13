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


// capture file-path & optional glob pattern
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

// cached information
handler.forget = function forget() {
    this.cache = {};
};
handler.forget();


module.exports = handler;
