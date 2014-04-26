'use strict';

var _und = require('underscore');
var theLib = require('../lib/index');

// capture the location
module.exports = function redirectTo(route) {
    return function handler(req, res, cb) {
        res.redirect(theLib.baseURL(route));
    };
};
