'use strict';

var Promise = require('bluebird');

// capture the app
module.exports = function(app) {
    var render = Promise.promisify(app.render, app);

    return function(req, res, cb) {
        return render('derp.md').then(function(body) {
            res.send(body);
        }).error(cb);
    };
};
