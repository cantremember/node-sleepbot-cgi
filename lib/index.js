'use strict';

// execute our temporary polyfills
require('./polyfill');


// jshint -W079
const Promise = require('bluebird');
// jshint +W079
const path = require('path');
const fs = require('fs');
const willReadFile = Promise.promisify(fs.readFile);
const willStat = Promise.promisify(fs.stat);
const glob = Promise.promisify(require('glob'));
const csv = require('csv');


const FS_READ_OPTIONS = Object.freeze({
    encoding: 'utf8'
});
const CSV_PARSE_OPTIONS = Object.freeze({
    delimiter:        '\t', // TSV
    trim:             true,
    comment:          '#',
    skip_empty_lines: true,
    // a magic option that `csv-parse` injects;
    //   without it, we can't Object#freeze
    //   "TypeError: Invalid non-string/buffer chunk"
    objectMode:       true,
});
const forgetMemoize = [];


/**
 * #### A Library of Functions and Singletons
 *
 * &nbsp;
 *
 * @namespace lib
 */
const theLib = {
    /**
     * @memberof lib
     * @see config
     */
    config: require('./config'),

    /**
     * @memberof lib
     * @see app
     */
    get app() {
        // avoid circular dependency hell with a getter
        return require('./app');
    },


    /**
     * @memberof lib
     * @param {Function} will a Function executing a Promise whose result will be memoized
     * @returns {Function} a Function returning a Promise which memomizes the result of `will`
     */
    willMemoize: function willMemoize(will) {
        let result;
        forgetMemoize.push(() => {
            result = undefined;
        });

        // leave as a Function;
        //   the scope of `this` & `arguments` are bound to where
        //   the `() => { }` is defined, vs. decoupled, as we need it to be
        return function() {
            if (result !== undefined) {
                return Promise.resolve(result);
            }

            const self = this;
            const args = arguments;
            return Promise.resolve()
            .then(() => {
                // from within an established Promise
                return will.apply(self, args);
            })
            .then((_result) => {
                if (theLib.config.get('caching')) {
                    // cache
                    result = _result;
                }
                return _result;
            });
        };
    },

    /**
     * Forgets any results cached by {@link lib.willMemoize}
     *
     * @memberof lib
     */
    forget: function forget() {
        for (let f of forgetMemoize) {
            f();
        }
    },

    /**
     * This method is used within the Promise chain in [Express](https://npmjs.com/package/express) handlers.
     *
     * The callback passed by Express to a handler should only be called
     * - to halt the chain due to an unrecoverable Error in the handler, or
     * - to otherwise continue down the middleware chain past the handler
     *
     * Express does *not* expect a callback after an `express.response#end`;
     * that operation should terminate the chain.
     *
     * However, Promises are used for asynchronous executional flow,
     * and for Test Suite purposes, it's important to know if a handler has resolved or rejected.
     * Re-throwing the Error makes this possible.
     *
     * @memberof lib
     * @param {Function} cb a [CPS](https://en.wikipedia.org/wiki/Continuation-passing_style) callback Function
     * @returns {Function} a callback Function which takes an Error and
     *   - invokes `cb` with the Error
     *   - throws the Error, assumably to reject by the Promise chain in which the Error was caught
     */
    callbackAndThrowError: function callbackAndThrowError(cb) {
        return (err) => {
            if (typeof cb === 'function') {
                cb(err);
            }
            throw err;
        };
    },

    /**
     * @memberof lib
     * @param {Array<Object>} array an Array
     * @returns {Object} a random value from `array`
     */
    chooseAny: function chooseAny(array) {
        if (! Array.isArray(array)) {
            return undefined;
        }
        const choice = Math.floor(Math.random() * array.length);
        return array[choice];
    },

    /**
     * @memberof lib
     * @param {String} route a root-relative path
     * @returns {String} an absolute URL relative to `baseURL` from {@link config}
     */
    baseURL: function baseURL(route = '') {
        return this.config.get('baseURL') + route;
    },


    /**
     * @example
     * assert.deepEqual(
     *     lib.columnToIndexMap('zero one two'),
     *     { zero: 0, one: 1, two: 2 }
     * )
     *
     * @memberof lib
     * @param {String} spaceDelimited a space-delimited String of column names
     * @returns {Object<Integer>} a property Object mapping each column name to its column index
     */
    columnToIndexMap: function columnToIndexMap(spaceDelimited) {
        return (spaceDelimited || '').split(/\s/).reduce((total, column, index) => {
            if (column !== '') {
                total[column] = index;
            }
            return total;
        }, {});
    },

    /**
     * @example
     * assert.deepEqual(
     *     lib.dataColumnMap([ 'cero', 'uno', 'dos' ], { zero: 0, one: 1, two: 2 }),
     *     { zero: 'cero', one: 'uno', two: 'dos' }
     * )
     *
     * @memberof lib
     * @param {Array<Object>} row an Array of values
     * @param {Object<Integer>} columnToIndex the results of {@link lib.columnToIndexMap}
     * @returns {Object<Object>} a property Object mapping each column name to its `row` value
     */
    dataColumnMap: function dataColumnMap(row, columnToIndex) {
        return Object.keys(columnToIndex || {}).reduce((map, key) => {
            map[key] = row[columnToIndex[key]];
            return map;
        }, {});
    },


    /**
     * #### A Library of Functions relating to `wwwRoot` from {@link config}
     *
     * &nbsp;
     *
     * @namespace lib.wwwRoot
     */
    wwwRoot: {
        /**
         * @see lib.dataColumnMap
         * @memberof lib.wwwRoot
         * @param {String} relativePath a path relative to {@link lib.wwwRoot}
         * @param {Object<Integer>} [options] options for a [csv](https://www.npmjs.com/package/csv) parser
         * @returns {Promise<Array>} a Promise resolving the rows of the TSV file at `relativePath`
         */
        willLoadTSV: function willLoadTSV(relativePath, options = CSV_PARSE_OPTIONS) {
            return new Promise((resolve, reject) => {
                try {
                    const filepath = path.join(theLib.config.get('wwwRoot'), relativePath);
                    const reader = fs.createReadStream(filepath, FS_READ_OPTIONS);
                    const parser = csv.parse(options);
                    const buffer = [];

                    reader.on('error', reject);
                    parser.on('error', reject);
                    parser.on('readable', () => {
                        let data;
                        while (data = parser.read()) {
                            buffer.push(data);
                        }
                    });
                    parser.on('end', () => {
                        // do not release Zalgo
                        setImmediate(() => {
                            resolve(buffer);
                        });
                    });
                    reader.pipe(parser);
                }
                catch (err) {
                    reject(err);
                }
            })
            .then((result) => {
                // drop the first line -- the headers
                return result.slice(1);
            });
        },

        /**
         * @memberof lib.wwwRoot
         * @param {String} relativePath a path relative to {@link lib.wwwRoot}
         * @returns {Promise<String>} a Promise resolving the contents of the file at `relativePath`
         */
        willLoadFile: function willLoadFile(relativePath) {
            return this.willDetectFile(relativePath)
            .then((exists) => {
                if (! exists) {
                    return '';
                }

                const filepath = path.join(theLib.config.get('wwwRoot'), relativePath);
                return willReadFile(filepath, FS_READ_OPTIONS);
            });
        },

        /**
         * @memberof lib.wwwRoot
         * @param {String} fileglob a path-and-glob-pattern relative to {@link lib.wwwRoot}
         * @returns {Promise<Array>} a Promise resolving the filenames matching `fileglob`
         */
        willGetFilenames: function willGetFilenames(fileglob) {
            return glob(
                path.join(theLib.config.get('wwwRoot'), fileglob)
            ).then((files) => {
                // just the filename, please
                return files.map((file) => {
                    return path.basename(file);
                });
            });
        },

        /**
         * @memberof lib.wwwRoot
         * @param {String} relativePath a path relative to {@link lib.wwwRoot}
         * @returns {Promise<Array>} a Promise resolving true if a file exists at `relativePath`
         */
        willDetectFile: function willDetectFile(relativePath) {
            return willStat(path.join(theLib.config.get('wwwRoot'), relativePath))
            .then((stat) => {
                return stat.isFile();
            })
            .catch((err) => {
                // traverse the cause chain, eg. `OperationalError`
                let cause;
                while (cause = err.cause) {
                    err = cause;
                }

                if (err.code === 'ENOENT') {
                    return false;
                }
                throw err;
            });
        },
    },
};


module.exports = theLib;
