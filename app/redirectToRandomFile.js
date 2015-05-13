'use strict';

var path = require('path');
var theLib = require('../lib/index');


// capture file-path & optional glob pattern
module.exports = function(filepath, glob) {
    glob = glob || /* istanbul ignore next */ '*.*';

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
        .return(res)
        .catch(theLib.callbackAndThrowError(cb));
    };
};
