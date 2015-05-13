'use strict';

var theLib = require('../lib/index');


// capture the location
module.exports = function redirectTo(route) {
    return function handler(req, res) {
        res.redirect(theLib.baseURL(route));
    };
};
