'use strict';

var path = require('path');
var _und = require('underscore');


module.exports = _und.defaults({
    // overrides
    wwwRoot: '/Volumes/GrandMasterKashik/archive/http',

    baseURL: 'http://localhost:3000',
}, require('./default'));
