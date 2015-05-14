'use strict';

var Promise = require('bluebird');
var path = require('path');
var fs = require('fs');
var willReadFile = Promise.promisify(fs.readFile);
var willStat = Promise.promisify(fs.stat);
var glob = Promise.promisify(require('glob'));
var csv = require('csv');


var FS_READ_OPTIONS = {
    encoding: 'utf8'
};
var CSV_PARSE_OPTIONS = {
    delimiter:        '\t', // TSV
    trim:             true,
    comment:          '#',
    skip_empty_lines: true,
};
var forgetMemoize = [];


/**
 * #### A Library of Functions and Singletons
 *
 * &nbsp;
 *
 * @namespace lib
 */
var theLib = {
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
        var result;
        forgetMemoize.push(function() {
            result = undefined;
        });

        return function() {
            if (result !== undefined) {
                return Promise.resolve(result);
            }

            var self = this;
            var args = arguments;
            return Promise.resolve()
            .then(function() {
                // from within an established Promise
                return will.apply(self, args);
            })
            .then(function(_result) {
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
        forgetMemoize.forEach(function(f) {
            f();
        });
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
        return function(err) {
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
        var choice = Math.floor(Math.random() * array.length);
        return array[choice];
    },

    /**
     * @memberof lib
     * @param {String} route a root-relative path
     * @returns {String} an absolute URL relative to `baseURL` from {@link config}
     */
    baseURL: function baseURL(route) {
        return this.config.get('baseURL') + (route || /* istanbul ignore next */ '');
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
        return (spaceDelimited || '').split(/\s/).reduce(function(total, column, index) {
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
        return Object.keys(columnToIndex || {}).reduce(function(map, key) {
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
        willLoadTSV: function willLoadTSV(relativePath, options) {
            return new Promise(function(resolve, reject) {
                try {
                    var filepath = path.join(theLib.config.get('wwwRoot'), relativePath);
                    var reader = fs.createReadStream(filepath, FS_READ_OPTIONS);
                    var parser = csv.parse(options || CSV_PARSE_OPTIONS);
                    var buffer = [];

                    reader.on('error', reject);
                    parser.on('error', reject);
                    parser.on('readable', function() {
                        var data;
                        while (data = parser.read()) {
                            buffer.push(data);
                        }
                    });
                    parser.on('end', function() {
                        setImmediate(function() {
                            resolve(buffer);
                        });
                    });
                    reader.pipe(parser);
                }
                catch (err) {
                    reject(err);
                }
            })
            .then(function(result) {
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
            .then(function(exists) {
                if (! exists) {
                    return '';
                }

                var filepath = path.join(theLib.config.get('wwwRoot'), relativePath);
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
            ).then(function(files) {
                // just the filename, please
                return files.map(function(file) {
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
            .then(function(stat) {
                return stat.isFile();
            })
            .catch(function(err) {
                // traverse the cause chain, eg. `OperationalError`
                var cause;
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