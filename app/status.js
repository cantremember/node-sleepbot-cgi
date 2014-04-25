'use strict';

// capture the app
module.exports = function(app) {
    return function(req, res, cb) {
        res.send({
            ok: true,
        });
    };
};
