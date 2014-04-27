'use strict';

var path = require('path');
var _und = require('underscore');


module.exports = _und.defaults({
    // overrides
    baseURL: 'http://www.sleepbot.com',

    // overrides the default config
}, require('./default'));
