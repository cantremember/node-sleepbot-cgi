'use strict';

var path = require('path');
var Promise = require('bluebird');
var theLib = require('../lib/index');

// capture file-path & optional glob pattern
module.exports = function(filepath, glob) {
    glob = glob || '*.*';

    // a Promise
    var globpath = path.join(filepath, glob);
    var willGetFilenames = theLib.willMemoize(function() {
        return theLib.wwwRoot.willGetFilenames(globpath);
    });

    return function handler(req, res, cb) {
        return willGetFilenames()
        .then(function(filenames) {
            var choice = theLib.chooseAny(filenames);
            if (choice === undefined) {
                throw new Error('no glob results: ' + globpath);
            }

            res.redirect(theLib.baseURL(
                path.join(filepath, theLib.chooseAny(filenames))
            ));
        })
        .catch(theLib.callbackAndThrowError(cb));
    };
};
