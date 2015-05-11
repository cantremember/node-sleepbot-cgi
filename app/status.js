'use strict';

var STATUS = Object.freeze({
    ok: true
})

module.exports = function handler(req, res, cb) {
    res.send(STATUS);
};
