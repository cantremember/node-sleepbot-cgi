'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');
var glob = require('glob');

var VIEWS_ROOT = path.join(__dirname, '../views'); // relative to *me*
var theConfig = require('../lib/config');


module.exports = {
    // returns a Function that throws
    throws: function(e) {
        return function() {
            throw e || (new Error('threw'));
        };
    },

    // returns a Function that asserts it shouldn't be called
    notCalled: function notCalled() {
        assert(false, 'should not be called');
    },

    realEjs: function(filename) {
        return fs.readFileSync(path.join(VIEWS_ROOT, filename), { encoding: 'utf8' });
    },

    mockConfig: function(store, config) {
        config = config || theConfig;
        config.stores.mock.store = (store || {});
    },

    mockGlob: function(sandbox, fResults) {
        return sandbox.stub(glob.Glob.prototype, '_process', function() {
            this.emit('end', fResults.apply(this, arguments));
        });
    },
};
