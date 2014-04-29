'use strict';

var Promise = require('bluebird');
var _und = require('underscore');
var path = require('path');
var fs = require('fs');
var readFile = Promise.promisify(fs.readFile);
var glob = Promise.promisify(require('glob'));
var csv = require('csv');


var theLib = {
    // this will assert that there's a valid config
    config: require('./config'),

    setupEJS: function setupEJS(ejs) {
        // ejs.filters.escapeQuote = function(value) {
        //     return (value || '').gsub('"', '&quot;');
        // };
        return ejs;
    },


    // a Promise to memomize the result of another Promise
    //   will = returns the Promise whose result will be memoized
    willMemoize: function willMemoize(will) {
        var result;
        return function() {
            if (! _und.isUndefined(result)) {
                return Promise.resolve(result);
            }
            return Promise.resolve().then(function() {
                // from within an established Promise
                return will.apply(this, arguments);
            }).then(function(_result) {
                if (theLib.config.caching) {
                    // cache
                    result = _result;
                }
                return _result;
            });
        };
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
            cb && cb(err);
            throw err;
        };
    },

    // random choice from an Array
    chooseAny: function chooseAny(array) {
        if (! array) {
            return undefined;
        }
        var choice = Math.floor(Math.random() * array.length);
        return array[choice];
    },

    // returns a URL relative to the baseURL
    baseURL: function baseURL(route) {
        return this.config.baseURL + route;
    },


    // column -> index mapping
    columnToIndexMap: function columnToIndexMap(spaceDelimited) {
        return spaceDelimited.split(/\s/).reduce(function(total, column, index) {
            total[column] = index;
            return total;
        }, {});
    },

    // transform row into a property Object keyed by column
    dataColumnMap: function dataColumnMap(row, columns) {
        return Object.keys(columns).reduce(function(map, key) {
            map[key] = row[columns[key]];
            return map;
        }, {});
    },


    // everything related to wwwRoot
    wwwRoot: {
        // a Promise to load the CSV
        willLoadCSV: function willLoadCSV(relativePath, options) {
            return new Promise(function(resolve) {
                // from CSV
                //   non-standard continuation takes only the result
                //   must listen to 'error'
                csv().from.path(
                    path.join(theLib.config.wwwRoot, relativePath)
                ).from.options(options || {
                    delimiter: "\t",
                    trim: true,
                }).to.array(resolve);
            }).then(function(result) {
                // drop the first line -- the line count
                result.shift();

                return result;
            });
        },

        // a Promise to load the file
        willLoadFile: function willLoadFile(relativePath) {
            var filename = path.join(theLib.config.wwwRoot, relativePath);
            if (! this.hasFile(relativePath)) {
                return Promise.resolve('');
            }
            return readFile(filename).then(function(buffer) {
                return buffer.toString();
            })
        },

        // a Promise to return the pathnames from the filepath
        //   fileglob = a glob expression
        willGetFilenames: function willGetFilenames(fileglob) {
            return glob(
                path.join(theLib.config.wwwRoot, fileglob)
            ).then(function(files) {
                // just the filename, please
                return files.map(function(file) {
                    return path.basename(file);
                })
            });
        },

        // the file exists
        //   which takes non-zero time to determine,
        //   and seems to take a while when it *doesn't* exist
        hasFile: function hasFile(relativePath) {
            return fs.existsSync(path.join(theLib.config.wwwRoot, relativePath));
        },
    },
};


module.exports = theLib;
