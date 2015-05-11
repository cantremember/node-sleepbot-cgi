'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');
var _und = require('underscore');
var glob = require('glob');
var Promise = require('bluebird');

var VIEWS_ROOT = path.join(__dirname, '../views'); // relative to *me*

var callsLastArg = function callsLastArg(result) {
    return function() {
        var cb = arguments[arguments.length - 1];
        if (typeof cb === 'function') {
            cb(null, result);
        }
    };
};


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

    mockRequest: function mockRequest(sandbox, option) {
        return _und.extend({
            headers: [],
            params: {},
            param: function(key) {
                return this.params[key];
            },
            cookies: {},
        }, option);
    },

    mockResponse: function mockResponse(sandbox, option) {
        return _und.extend({
            send:     sandbox.spy(callsLastArg()),
            redirect: sandbox.spy(callsLastArg()),
            render:   sandbox.spy(callsLastArg('body')),
        }, option);
    },

    mockGlob: function(sandbox, fResults) {
        return sandbox.stub(glob.Glob.prototype, '_process', function() {
            this.emit('end', fResults.apply(this, arguments));
        });
    },
};
