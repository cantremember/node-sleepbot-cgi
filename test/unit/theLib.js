/* eslint max-nested-callbacks: [ 1, 5 ] */

const Promise = require('bluebird');
const assert = require('assert');
const sinon = require('sinon');
const mockfs = require('mock-fs');
const fs = require('fs');
const path = require('path');

const theLib = require('../../lib/index');
const theHelper = require('../helper');


describe('lib/index', () => {
    let sandbox;
    beforeEach(() => {
        // own own private sandbox
        sandbox = sinon.sandbox.create();
    });
    afterEach(() => {
        sandbox.restore();
        mockfs.restore();
        theHelper.mockConfig();

        theLib.forget();
    });


    describe('config', () => {
        it('overrides as expected', () => {
            assert(Array.isArray(theLib.config.get('sebServers')));

            assert.equal(theLib.config.get('wwwRoot'), '/mock-fs');
        });
    });

    describe('app', () => {
        it('does not cause circular dependency issues', () => {
            assert(theLib.app);

            assert.equal(theLib.app.settings['view engine'], 'ejs');
        });
    });


    describe('willMemoize', () => {
        let willPromise;
        let willHaveMemoized;
        beforeEach(() => {
            willPromise = sandbox.spy((value) => {
                return Promise.delay(0).return(value);
            });
            willHaveMemoized = theLib.willMemoize(willPromise);
        });

        it('does not memoize when caching is disabled', () => {
            assert(! theLib.config.get('caching'));

            return willHaveMemoized(1)
            .then((value) => {
                assert.equal(value, 1);
                assert(willPromise.calledOnce);

                return willHaveMemoized(2);
            })
            .then((value) => {
                assert.equal(value, 2);
                assert(willPromise.calledTwice);
            });
        });

        it('memoizes when caching is enabled', () => {
            theHelper.mockConfig({ caching: true });

            return willHaveMemoized()
            .then((value) => {
                assert.strictEqual(value, undefined);
                assert(willPromise.calledOnce);

                return willHaveMemoized(1);
            })
            .then((value) => {
                // 1 is the first non-`undefined` value
                assert.equal(value, 1);
                assert(willPromise.calledTwice);

                return willHaveMemoized(2);
            })
            .then((value) => {
                // 2 is ignored because 1 was cached
                assert.equal(value, 1);
                assert(willPromise.calledTwice);
            });
        });
    });

    describe('forget', () => {
        let willHaveMemoized;
        beforeEach(() => {
            willHaveMemoized = theLib.willMemoize((value) => {
                return Promise.resolve(value);
            });
        });

        it('forgets what has been cached', () => {
            theHelper.mockConfig({ caching: true });

            return willHaveMemoized(1)
            .then((value) => {
                assert.strictEqual(value, 1);

                return willHaveMemoized(2);
            })
            .then((value) => {
                // already cached
                assert.strictEqual(value, 1);

                theLib.forget();

                return willHaveMemoized(2);
            })
            .then((value) => {
                // cache was flushed
                assert.strictEqual(value, 2);
            });
        });
    });

    describe('callbackAndThrowError', () => {
        const BOOM = new Error('BOOM');
        let handler;

        it('dispatches an Error to its Promise chain without a callback', () => {
            handler = sandbox.spy(theLib.callbackAndThrowError());

            return Promise.reject(BOOM)
            .then(theHelper.notCalled, handler)
            .then(theHelper.notCalled, (err) => {
                assert.strictEqual(err, BOOM);

                assert(handler.calledOnce);
            });
        });

        it('dispatches an Error to a callback and its Promise chain', () => {
            const cb = sinon.spy((err) => {
                assert.equal(err.message, 'BOOM');
            });
            handler = sandbox.spy(theLib.callbackAndThrowError(cb));

            return Promise.reject(BOOM)
            .then(theHelper.notCalled, handler)
            .then(theHelper.notCalled, (err) => {
                assert.equal(err.message, 'BOOM');

                assert(handler.calledOnce);
                assert(cb.calledOnce);
            });
        });
    });

    describe('chooseAny', () => {
        it('ignores a non-Array', () => {
            assert.strictEqual(theLib.chooseAny(), undefined);
            assert.strictEqual(theLib.chooseAny('string'), undefined);
            assert.strictEqual(theLib.chooseAny({ object: true }), undefined);
        });

        it('chooses a value from an Array', () => {
            assert.strictEqual(theLib.chooseAny([]), undefined);
            assert.strictEqual(theLib.chooseAny([ 1 ]), 1);
            for (let i = 0; i < 10; ++i) {
                assert([ 1, 2 ].includes(theLib.chooseAny([ 1, 2 ])));
            }
        });
    });

    describe('columnToIndexMap', () => {
        it('maps a space-delimited String of columns to their indexes', () => {
            let map;

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

    describe('dataColumnMap', () => {
        const DATA = [ 'a', 'b', 'c' ];

        it('maps an Array of values using a column-to-index map', () => {
            let map;

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


    describe('wwwRoot', () => {
        // make sure header is on the 1st line
        const TSV_CONTENT = `A\tB

# comments and blank lines ignored
1 \t2

 ä\t 🐝
`;
        let wwwRoot;
        before(() => {
            wwwRoot = theLib.wwwRoot;
        });

        describe('willLoadTSV', () => {
            it('loads and trims the rows of a TSV by default', () => {
                mockfs({ '/mock-fs': {
                    'test.tsv': TSV_CONTENT
                } });

                return wwwRoot.willLoadTSV('/test.tsv')
                .then((rows) => {
                    assert.deepEqual(rows, [
                        [ 1, 2 ],
                        [ 'ä', '🐝' ],
                    ]);
                });
            });

            it('can take CSV parsing options', () => {
                mockfs({ '/mock-fs': {
                    'test.tsv': TSV_CONTENT
                } });

                return wwwRoot.willLoadTSV('/test.tsv', { /* default CSV */ })
                .then((rows) => {
                    assert.deepEqual(rows, [
                        [ '' ],
                        [ '# comments and blank lines ignored' ],
                        [ '1 \t2' ],
                        [ '' ],
                        [ ' ä\t 🐝' ]
                    ]);
                });
            });

            it('loads nothing from an empty TSV', () => {
                mockfs({ '/mock-fs': {
                    'test.tsv': ''
                } });

                return wwwRoot.willLoadTSV('/test.tsv')
                .then((rows) => {
                    assert.deepEqual(rows, []);
                });
            });

            it('fails on a missing file', () => {
                mockfs({ '/mock-fs': { } });

                return wwwRoot.willLoadTSV('/test.tsv')
                .then(theHelper.notCalled, (err) => {
                    assert(err.message.match(/ENOENT/));
                });
            });

            it('fails on a file-system Error', () => {
                sandbox.stub(fs, 'createReadStream').throws(new Error('BOOM'));

                return wwwRoot.willLoadTSV('/test.tsv')
                .then(theHelper.notCalled, (err) => {
                    assert.equal(err.message, 'BOOM');
                });
            });
        });

        describe('willLoadFile', () => {
            it('loads a file', () => {
                mockfs({ '/mock-fs': {
                    'test.txt': ' whitespace preserved '
                } });

                return wwwRoot.willLoadFile('/test.txt')
                .then((content) => {
                    assert.equal(content, ' whitespace preserved ');
                });
            });

            it('loads a Unicode buffer', () => {
                mockfs({ '/mock-fs': {
                    'test.txt': new Buffer([ 100, 101, 114, 112, 32, 0xE2, 0x99, 0xA5, 0xEF, 0xB8, 0x8F ])
                } });

                return wwwRoot.willLoadFile('/test.txt')
                .then((content) => {
                    assert.equal(content, 'derp ♥️');
                });
            });

            it('loads nothing from an empty file', () => {
                mockfs({ '/mock-fs': {
                    'test.txt': new Buffer(0)
                } });

                return wwwRoot.willLoadFile('/test.txt')
                .then((content) => {
                    assert.strictEqual(content, '');
                });
            });

            it('loads nothing from a missing file', () => {
                mockfs({ '/mock-fs': { } });

                return wwwRoot.willLoadFile('/test.txt')
                .then((content) => {
                    assert.strictEqual(content, '');
                });
            });

            it('fails on a file-system Error', () => {
                mockfs({ '/mock-fs': { } });
                sandbox.stub(wwwRoot, 'willDetectFile').returns(
                    Promise.resolve(true)
                );

                return wwwRoot.willLoadFile('/test.txt')
                .then(theHelper.notCalled, (err) => {
                    assert(err.message.match(/ENOENT/));
                });
            });
        });

        describe('willGetFilenames', () => {
            it('returns filenames from a mock glob', () => {
                theHelper.mockGlob(sandbox, () => {
                    return [ 'another.file', 'glob.file' ];
                });

                return wwwRoot.willGetFilenames(path.join('path', '*'))
                .then((filenames) => {
                    assert.deepEqual(filenames, [
                        'another.file',
                        'glob.file',
                    ]);
                });
            });

            it('returns filenames from a physical file-system', () => {
                theHelper.mockConfig({ wwwRoot: __dirname });

                return wwwRoot.willGetFilenames('*')
                .then((filenames) => {
                    assert.deepEqual(filenames.sort(), [
                        'ambienceAnySample.js',
                        'config.js',
                        'fuccSchedule.js',
                        'http404.js',
                        'lookitAnyStory.js',
                        'morganLayout.js',
                        'polyfill.js',
                        'redirectToRandomFile.js',
                        'sebStatusHTML.js',
                        'sebStatusXML.js',
                        'theLib.js',
                        'WRLDtimeUTC.js',
                    ].sort());

                    // no directories
                    return wwwRoot.willGetFilenames(path.join(__dirname, '.*'));
                })
                .then((filenames) => {
                    assert.deepEqual(filenames, []);
                });
            });

            it('returns nothing from a missing directory', () => {
                return wwwRoot.willGetFilenames('BOGUS/path/*')
                .then((filenames) => {
                    assert.deepEqual(filenames, []);
                });
            });
        });

        describe('willDetectFile', () => {
            beforeEach(() => {
                mockfs({ '/mock-fs': {
                    'file': new Buffer(0),
                    'subdir': { },
                } });
            });

            it('detects a file', () => {
                return wwwRoot.willDetectFile('/file')
                .then((exists) => {
                    assert(exists);
                });
            });

            it('ignores a directory', () => {
                return wwwRoot.willDetectFile('/subdir')
                .then((exists) => {
                    assert(! exists);
                });
            });

            it('ignores a missing file', () => {
                return wwwRoot.willDetectFile('/BOGUS')
                .then((exists) => {
                    assert(! exists);
                });
            });

            it('fails on a file-system Error', () => {
                sandbox.stub(fs.Stats.prototype, 'isFile').throws(new Error('BOOM'));

                return wwwRoot.willLoadFile('/file')
                .then(theHelper.notCalled, (err) => {
                    assert.equal(err.message, 'BOOM');
                });
            });
        });
    });
});
