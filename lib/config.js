'use strict';

const path = require('path');
const nconf = require('nconf');

const config = (new nconf.Provider())
    .add('mock', { type: 'literal', store: {} }) // @see test/helper#mockConfig
    .add('memory')
    .argv()
    .env()
;

// ENV-driven defaults
const env = config.get('NODE_ENV');
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


/**
 * #### Hierarchical configuration, using [nconf](https://www.npmjs.com/package/nconf)
 *
 * &nbsp;
 *
 * @namespace config
 */
module.exports = config;
