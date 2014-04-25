'use strict';

var Promise = require('bluebird');

// capture the app
module.exports = function(app) {
    var render = Promise.promisify(app.render, app);

    return function(req, res, cb) {
        return render('http404.ejs', {
            real_uri: req.headers['X-Real-Uri'],
        }).then(function(body) {
            res.send(body);
        }).error(cb);
    };
};
