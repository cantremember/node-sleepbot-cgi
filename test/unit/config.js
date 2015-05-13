'use strict';

var assert = require('assert');
var proxyquire = require('proxyquire');

var CONFIG_PATH = '../../lib/config';
var STUBS = Object.freeze({ '@noCallThru': false });
var theHelper = require('../helper');
var configTest = require('../../config/test');
var configDefault = require('../../config/default');


describe('lib/config', function() {
    var config;
    var env;
    beforeEach(function() {
        env = process.env['NODE_ENV'];
    });
    afterEach(function() {
        process.env['NODE_ENV'] = env;

        theHelper.mockConfig();
    });


    it('provides a test environment', function() {
        assert.equal(process.env['NODE_ENV'], 'test');

        config = proxyquire(CONFIG_PATH, STUBS);
        assert.deepEqual(
            Object.keys(config.stores),
            [ 'mock', 'memory', 'argv', 'env', 'file/test', 'file/defaults' ]
        );

        assert.equal(config.get('NODE_ENV'), 'test');
        assert.equal(config.get('wwwRoot'), configTest.wwwRoot);
        assert.equal(config.get('httpPort'), configDefault.httpPort);
    });

    it('provides no environment', function() {
        delete process.env['NODE_ENV'];

        config = proxyquire(CONFIG_PATH, STUBS);
        assert.deepEqual(
            Object.keys(config.stores),
            [ 'mock', 'memory', 'argv', 'env', 'file/defaults' ]
        );

        assert.strictEqual(config.get('NODE_ENV'), undefined);
        assert.equal(config.get('wwwRoot'), configDefault.wwwRoot);
        assert.equal(config.get('httpPort'), configDefault.httpPort);
    });

    it('survives an invalid environment', function() {
        process.env['NODE_ENV'] = 'BOGUS';

        config = proxyquire(CONFIG_PATH, STUBS);
        assert.deepEqual(
            Object.keys(config.stores),
            [ 'mock', 'memory', 'argv', 'env', 'file/defaults' ]
        );

        assert.equal(config.get('NODE_ENV'), 'BOGUS');
        assert.equal(config.get('wwwRoot'), configDefault.wwwRoot);
        assert.equal(config.get('httpPort'), configDefault.httpPort);
    });

    it('can be overridden with mock values', function() {
        config = proxyquire(CONFIG_PATH, STUBS);
        theHelper.mockConfig({ wwwRoot: 'mock' }, config);

        assert.deepEqual(
            Object.keys(config.stores),
            [ 'mock', 'memory', 'argv', 'env', 'file/test', 'file/defaults' ]
        );
        assert.equal(config.get('wwwRoot'), 'mock');
        assert.equal(config.get('ntpTimeout'), configTest.ntpTimeout);
        assert.equal(config.get('httpPort'), configDefault.httpPort);
    });
});
