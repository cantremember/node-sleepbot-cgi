'use strict';

var path = require('path');
var Promise = require('bluebird');
var theLib = require('../lib/index');


// the filenames
var willGetFilenames = theLib.willMemoize(function() {
    return theLib.wwwRoot.willGetFilenames('lookit/story/*.txt');
});

// the files themselves
var fileCache = {};
var willGetFile = function(filepath) {
    var will = fileCache[filepath] || theLib.willMemoize(function() {
        return theLib.wwwRoot.willLoadFile(filepath);
    });
    if (theLib.config.caching) {
        // cache
        fileCache[filepath] = will;
    }
    // execute to produce a Promise
    return will();
};


// capture file-path & optional glob pattern
module.exports = function handler(req, res, cb) {
    return willGetFilenames().then(function(filenames) {
        var filepath = theLib.chooseAny(filenames);

        return willGetFile('lookit/story/' + filepath);
    }).then(function(body) {
        return Promise.promisify(res.render, res)('lookitAnyStory.ejs', {
            config: theLib.config,
            body: body,
        });
    }).then(function(body) {
        res.send(body);
    }).error(theLib.callbackAndThrowError(cb));
};
