'use strict';

var theLib = require('../lib/index');

module.exports = function handler(req, res, cb) {
    // the appropriate index file
    var config = req.cookies['morgan_config'];
    var route = ((config === 'flat')
        ? '/morgan/index_h.html'
        : '/morgan/index_p.html'
    );

    res.redirect(theLib.baseURL(route));
};
