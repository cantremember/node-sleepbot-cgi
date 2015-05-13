'use strict';

var path = require('path');
var nconf = require('nconf');

var config = (new nconf.Provider())
    .add('mock', { type: 'literal', store: {} }) // @see test/helper#mockConfig
    .add('memory')
    .argv()
    .env()
;

// ENV-driven defaults
var env = config.get('NODE_ENV');
try {
    if (env) {
        config.add(path.join('file', env), {
            type: 'literal',
            store: require(path.join('../config', env))
        });
        console.log('environment is:', env);
    }
}
catch (err) {
    console.log('invalid environment:', env, ':', err);
}

// baseline defaults
config.add('file/defaults', {
    type: 'literal',
    store: require(path.join('../config/default'))
});


module.exports = config;
