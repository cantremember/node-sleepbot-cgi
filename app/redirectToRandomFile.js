'use strict';

var path = require('path');
var Promise = require('bluebird');
var theLib = require('../lib/index');

// capture file-path & optional glob pattern
module.exports = function(filepath, glob) {
    glob = glob || '*.*';

    // a Promise
    var willGetFilenames = theLib.willMemoize(function() {
        return theLib.wwwRoot.willGetFilenames(
            path.join(filepath, glob)
        );
    });

    return function handler(req, res, cb) {
        return willGetFilenames().then(function(filenames) {
            res.redirect(theLib.baseURL(
                path.join(filepath, theLib.chooseAny(filenames))
            ));
        }).error(theLib.callbackAndThrowError(cb));
    };
};
