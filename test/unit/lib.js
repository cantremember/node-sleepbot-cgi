'use strict';

var assert = require('assert');
var sinon = require('sinon');
var mockfs = require('mock-fs');
var fs = require('fs');
var path = require('path');
var Promise = require('bluebird');

var theLib = require('../../lib/index');
var theHelper = require('../helper');


describe('lib/index', function() {
    var sandbox;
    var req, res;
    beforeEach(function() {
        // own own private sandbox
        sandbox = sinon.sandbox.create();
    });
    afterEach(function() {
        sandbox.restore();
        mockfs.restore();
    });


    describe('config', function() {
        it('overrides as expected', function() {
            assert(Array.isArray(theLib.config.sebServers));

            assert.equal(theLib.config.wwwRoot, '/mock-fs');
        });
    });

    describe('app', function() {
        it('does not cause circular dependency issues', function() {
            assert(theLib.app);

            assert.equal(theLib.app.settings['view engine'], 'ejs');
        });
    });


    describe('willMemoize', function() {
        var caching;
        var willPromise;
        var willHaveMemoized;
        beforeEach(function() {
            caching = theLib.config.caching;
            willPromise = sandbox.spy(function(value) {
                return Promise.delay(0).return(value);
            });
            willHaveMemoized = theLib.willMemoize(willPromise);
        });
        afterEach(function() {
            theLib.config.caching = caching;
        });

        it('does not memoize when caching is disabled', function() {
            assert(! theLib.config.caching);

            return willHaveMemoized(1)
            .then(function(value) {
                assert.equal(value, 1);
                assert(willPromise.calledOnce);

                return willHaveMemoized(2)
            })
            .then(function(value) {
                assert.equal(value, 2);
                assert(willPromise.calledTwice);
            });
        });

        it('memoizes when caching is enabled', function() {
            theLib.config.caching = true;

            return willHaveMemoized()
            .then(function(value) {
                assert.strictEqual(value, undefined);
                assert(willPromise.calledOnce);

                return willHaveMemoized(1)
            })
            .then(function(value) {
                // 1 is the first non-`undefined` value
                assert.equal(value, 1);
                assert(willPromise.calledTwice);

                return willHaveMemoized(2)
            })
            .then(function(value) {
                // 2 is ignored because 1 was cached
                assert.equal(value, 1);
                assert(willPromise.calledTwice);
            });
        });
    });

    describe('callbackAndThrowError', function() {
        var BOOM = new Error('BOOM');
        var handler;

        it('dispatches an Error to its Promise chain without a callback', function() {
            handler = sandbox.spy(theLib.callbackAndThrowError());

            return Promise.reject(BOOM)
            .then(theHelper.notCalled, handler)
            .then(theHelper.notCalled, function(err) {
                assert.strictEqual(err, BOOM);

                assert(handler.calledOnce);
            });
        });

        it('dispatches an Error to a callback and its Promise chain', function() {
            var cb = sinon.spy(function(err) {
                assert.equal(err.message, 'BOOM');
            });
            handler = sandbox.spy(theLib.callbackAndThrowError(cb));

            return Promise.reject(BOOM)
            .then(theHelper.notCalled, handler)
            .then(theHelper.notCalled, function(err) {
                assert.equal(err.message, 'BOOM');

                assert(handler.calledOnce);
                assert(cb.calledOnce);
            });
        });
    });

    describe('chooseAny', function() {
        it('ignores a non-Array', function() {
            assert.strictEqual(theLib.chooseAny(), undefined);
            assert.strictEqual(theLib.chooseAny('string'), undefined);
            assert.strictEqual(theLib.chooseAny({ object: true }), undefined);
        });

        it('chooses a value from an Array', function() {
            assert.strictEqual(theLib.chooseAny([]), undefined);
            assert.strictEqual(theLib.chooseAny([ 1 ]), 1);
            for (var i = 0; i < 10; ++i) {
                assert.notEqual([ 1, 2 ].indexOf(theLib.chooseAny([ 1, 2 ])), -1);
            }
        });
    });

    describe('columnToIndexMap', function() {
        it('maps a space-delimited String of columns to their indexes', function() {
            var map;

            map = theLib.columnToIndexMap();
            assert.equal(Object.keys(map).length, 0);

            map = theLib.columnToIndexMap('first,second third\tfourth|fifth');
            assert.deepEqual(map, {
                'first,second': 0,
                'third': 1,
                'fourth|fifth': 2,
            });
        });
    });

    describe('dataColumnMap', function() {
        var DATA = [ 'a', 'b', 'c' ];

        it('maps an Array of values using a column-to-index map', function() {
            var map;

            map = theLib.dataColumnMap(DATA);
            assert.equal(Object.keys(map).length, 0);

            map = theLib.dataColumnMap(DATA, { A: 0, B: 1 });
            assert.deepEqual(map, {
                A: 'a',
                B: 'b',
            });

            map = theLib.dataColumnMap(DATA, { A: 0, B: 1, C: 2, D: 3 });
            assert.deepEqual(map, {
                A: 'a',
                B: 'b',
                C: 'c',
                D: undefined,
            });
        });
    });


    describe('wwwRoot', function() {
        var TSV_CONTENT = "\
A\tB\n\
\n\
# comments and blank lines ignored\n\
1 \t2 \n\
\n\
 ä\t 🐝\n\
";
        var wwwRoot;
        before(function() {
            wwwRoot = theLib.wwwRoot;
        });

        describe('willLoadTSV', function() {
            it('loads and trims the rows of a TSV by default', function() {
                mockfs({ '/mock-fs': {
                    'test.tsv': TSV_CONTENT
                } });

                return wwwRoot.willLoadTSV('/test.tsv')
                .then(function(rows) {
                    assert.deepEqual(rows, [
                        [ 1, 2 ],
                        [ 'ä', '🐝' ],
                    ]);
                });
            });

            it('can take CSV parsing options', function() {
                mockfs({ '/mock-fs': {
                    'test.tsv': TSV_CONTENT
                } });

                return wwwRoot.willLoadTSV('/test.tsv', { /* default CSV */ })
                .then(function(rows) {
                    assert.deepEqual(rows, [
                        [ '' ],
                        [ '# comments and blank lines ignored' ],
                        [ '1 \t2 ' ],
                        [ '' ],
                        [ ' ä\t 🐝' ]
                    ]);
                });
            });

            it('loads nothing from an empty TSV', function() {
                mockfs({ '/mock-fs': {
                    'test.tsv': ""
                } });

                return wwwRoot.willLoadTSV('/test.tsv')
                .then(function(rows) {
                    assert.deepEqual(rows, []);
                });
            });

            it('fails on a missing file', function() {
                mockfs({ '/mock-fs': { } });

                return wwwRoot.willLoadTSV('/test.tsv')
                .then(theHelper.notCalled, function(err) {
                    assert(err.message.match(/ENOENT/));
                });
            });

            it('fails on a file-system Error', function() {
                sandbox.stub(fs, 'createReadStream').throws(new Error('BOOM'));

                return wwwRoot.willLoadTSV('/test.tsv')
                .then(theHelper.notCalled, function(err) {
                    assert.equal(err.message, 'BOOM');
                });
            });
        });

        describe('willLoadFile', function() {
            it('loads a file', function() {
                mockfs({ '/mock-fs': {
                    'test.txt': " whitespace preserved "
                } });

                return wwwRoot.willLoadFile('/test.txt')
                .then(function(content) {
                    assert.equal(content, ' whitespace preserved ');
                });
            });

            it('loads a Unicode buffer', function() {
                mockfs({ '/mock-fs': {
                    'test.txt': new Buffer([ 100, 101, 114, 112, 32, 0xE2, 0x99, 0xA5, 0xEF, 0xB8, 0x8F ])
                } });

                return wwwRoot.willLoadFile('/test.txt')
                .then(function(content) {
                    assert.equal(content, 'derp ♥️');
                });
            });

            it('loads nothing from an empty file', function() {
                mockfs({ '/mock-fs': {
                    'test.txt': new Buffer(0)
                } });

                return wwwRoot.willLoadFile('/test.txt')
                .then(function(content) {
                    assert.strictEqual(content, '');
                });
            });

            it('loads nothing from a missing file', function() {
                mockfs({ '/mock-fs': { } });

                return wwwRoot.willLoadFile('/test.txt')
                .then(function(content) {
                    assert.strictEqual(content, '');
                });
            });

            it('fails on a file-system Error', function() {
                mockfs({ '/mock-fs': { } });
                sandbox.stub(wwwRoot, 'willDetectFile').returns(
                    Promise.resolve(true)
                );

                return wwwRoot.willLoadFile('/test.txt')
                .then(theHelper.notCalled, function(err) {
                    assert(err.message.match(/ENOENT/));
                });
            });
        });

        describe('willGetFilenames', function() {
            var dir;
            beforeEach(function() {
                // physical vs. mock directory structure
                dir = theLib.config.wwwRoot;
            });
            afterEach(function() {
                theLib.config.wwwRoot = dir;
            });

            it('returns filenames from a mock glob', function() {
                theHelper.mockGlob(sandbox, function() {
                    return [ 'another.file', 'glob.file' ];
                });

                return wwwRoot.willGetFilenames(path.join('path', '*'))
                .then(function(filenames) {
                    assert.deepEqual(filenames, [
                        'another.file',
                        'glob.file',
                    ]);
                });
            });

            it('returns filenames from a physical file-system', function() {
                theLib.config.wwwRoot = '';

                return wwwRoot.willGetFilenames(path.join(__dirname, '*'))
                .then(function(filenames) {
                    assert.deepEqual(filenames, [
                        'ambienceAnySample.js',
                        'fuccSchedule.js',
                        'http404.js',
                        'lib.js',
                        'lookitAnyStory.js',
                        'morganLayout.js',
                        'redirectToRandomFile.js'
                    ].sort());

                    // no directories
                    return wwwRoot.willGetFilenames(path.join(__dirname, '.*'));
                })
                .then(function(filenames) {
                    assert.deepEqual(filenames, []);
                });
            });

            it('returns nothing from a missing directory', function() {
                return wwwRoot.willGetFilenames('BOGUS/path/*')
                .then(function(filenames) {
                    assert.deepEqual(filenames, []);
                });
            });
        });

        describe('willDetectFile', function() {
            beforeEach(function() {
                mockfs({ '/mock-fs': {
                    'file': new Buffer(0),
                    'subdir': { },
                } });
            });

            it('detects a file', function() {
                return wwwRoot.willDetectFile('/file')
                .then(function(exists) {
                    assert(exists);
                });
            });

            it('ignores a directory', function() {
                return wwwRoot.willDetectFile('/subdir')
                .then(function(exists) {
                    assert(! exists);
                });
                assert(! wwwRoot.hasFile('/BOGUS'));
            });

            it('ignores a missing file', function() {
                return wwwRoot.willDetectFile('/BOGUS')
                .then(function(exists) {
                    assert(! exists);
                });
            });
        });
    });
});
