'use strict';

// capture the location
module.exports = function redirectTo(location) {
    return function handler(req, res, cb) {
        res.redirect(location);
    };
};
