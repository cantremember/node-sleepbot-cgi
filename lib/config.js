'use strict';

var path = require('path');
var config;


// by RAILS_ENV, or 'default'
try {
    config = require(path.join('../config', process.env['NODE_ENV']));
}
catch (e) {}
try {
    config = config || require(path.join('../config', 'default'));
}
catch (e) {}
if (! config) {
    throw new Error('could not load config for default, ' + process.env['RAILS_ENV']);
}


// some useful methods
config.get = function(key) {
    if (! config.hasOwnProperty(key)) {
        throw new Error('config has no ' + key);
    }
    return config[key];
}


module.exports = config;
