'use strict';

var path = require('path');
var _und = require('underscore');


module.exports = _und.defaults({
    // overrides
    wwwRoot: '/Volumes/GrandMasterKashik/archive/http',
    // wwwRoot: '/mnt/ec2-http/sleepbot.com',

    baseURL: 'http://www.sleepbot.com',
    // baseURL: 'http://sleepbot.localhost:8080',
    // baseURL: 'http://localhost:3000',
}, require('./default'));
