'use strict';

var _und = require('underscore');


module.exports = _und.defaults({
    // overrides
    wwwRoot: '/mock-fs',

    baseURL: 'http://localhost:3000',
    // baseURL: 'http://sleepbot.localhost:8080',

    viewsRoot: '/mock-fs',
}, require('./default'));
