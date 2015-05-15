'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const VIEWS_ROOT = path.join(__dirname, '../views'); // relative to *me*
const theConfig = require('../lib/config');


module.exports = {
    // returns a Function that throws
    throws: function(e = new Error('threw')) {
        return () => { throw e; };
    },

    // returns a Function that asserts it shouldn't be called
    notCalled: function() {
        assert(false, 'should not be called');
    },

    realEjs: function(filename) {
        return fs.readFileSync(path.join(VIEWS_ROOT, filename), { encoding: 'utf8' });
    },

    mockConfig: function(store, config = theConfig) {
        config.stores.mock.store = (store || {});
    },

    mockGlob: function(sandbox, fResults) {
        // leave as a Function;
        //   the scope of `this` are bound to where
        //   the `() => { }` is defined, vs. the prototype to which it's attached
        return sandbox.stub(glob.Glob.prototype, '_process', function() {
            this.emit('end', fResults.apply(this, arguments));
        });
    },
};
