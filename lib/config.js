'use strict';

var path = require('path');
var config;


// by NODE_ENV, or 'default'
var configMode = process.env['NODE_ENV'];
try {
    config = require(path.join('../config', configMode));
}
catch (e) {}
try {
    if (! config) {
        configMode = 'default';
        config = require(path.join('../config', configMode));
    }
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
};


console.log('config mode is:', configMode);
module.exports = config;
