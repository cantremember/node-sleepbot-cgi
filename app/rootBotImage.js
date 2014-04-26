'use strict';

var Promise = require('bluebird');
var theLib = require('../lib/index');

// a Promise
function imageList() {
    return theLib.wwwFilenames('/images/animbot/*.gif').then(function(filenames) {
        // memoize
        imageList = function() {
            return Promise.resolve(filenames);
        };
        return filenames;
    });
};

module.exports = function handler(req, res, cb) {
    imageList().then(function(filenames) {
        res.redirect(theLib.baseURL(
            [ '/images/animbot/', theLib.chooseAny(filenames) ].join('')
        ));
    });
};
