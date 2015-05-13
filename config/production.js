'use strict';

var _und = require('underscore');


module.exports = _und.defaults({
    // overrides
    wwwRoot: '/mnt/ec2-http/sleepbot.com',
    caching: true,

    baseURL: 'http://www.sleepbot.com',
}, require('./default'));
