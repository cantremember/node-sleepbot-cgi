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


var theLib = {
    // this will assert that there's a valid config
    config: require('./config'),

    // avoid circular dependency hell
    get app() {
        return require('./app');
    },


    // a Promise to memomize the result of another Promise
    //   will = returns the Promise whose result will be memoized
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

    forget: function forget() {
        forgetMemoize.forEach(function(f) {
            f();
        });
    },

    // useful for Express
    //   which does *not* expect a callback after a #send,
    //   ultimately terminating the call chain.
    //   Errors, however, do get passed to the callback.
    // as far as Promise execution control is concerned
    //   it needs to receive the Error as well,
    //   so just throw it
    callbackAndThrowError: function callbackAndThrowError(cb) {
        return function(err) {
            if (typeof cb === 'function') {
                cb(err);
            }
            throw err;
        };
    },

    // random choice from an Array
    chooseAny: function chooseAny(array) {
        if (! Array.isArray(array)) {
            return undefined;
        }
        var choice = Math.floor(Math.random() * array.length);
        return array[choice];
    },

    // returns a URL relative to the baseURL
    baseURL: function baseURL(route) {
        return this.config.get('baseURL') + (route || /* istanbul ignore next */ '');
    },


    // column -> index mapping
    columnToIndexMap: function columnToIndexMap(spaceDelimited) {
        return (spaceDelimited || '').split(/\s/).reduce(function(total, column, index) {
            if (column !== '') {
                total[column] = index;
            }
            return total;
        }, {});
    },

    // transform a row of indexed values
    // into a property Object keyed by columns
    // via a column -> index mapping
    dataColumnMap: function dataColumnMap(row, columnToIndex) {
        return Object.keys(columnToIndex || {}).reduce(function(map, key) {
            map[key] = row[columnToIndex[key]];
            return map;
        }, {});
    },


    // everything related to wwwRoot
    wwwRoot: {
        // a Promise to load the CSV
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

        // a Promise to load the file
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

        // a Promise to return the pathnames from the filepath
        //   fileglob = a glob expression
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

        // the file exists
        //   which takes non-zero time to determine,
        //   and seems to take a while when it *doesn't* exist
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
