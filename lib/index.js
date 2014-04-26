'use strict';

var path = require('path');
var fs = require('fs');
var csv = require('csv');
var Promise = require('bluebird');


var theLib = {
    // this will assert that there's a valid config
    config: require('./config'),

    setupEJS: function setupEJS(ejs) {
        // ejs.filters.escapeQuote = function(value) {
        //     return (value || '').gsub('"', '&quot;');
        // };
        return ejs;
    },

    loadWwwCSV: function loadWwwCSV(relativePath, options) {
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

    wwwHasFile: function wwwHasFile(relativePath) {
        return fs.existsSync(path.join(theLib.config.wwwRoot, relativePath));
    },
};


module.exports = theLib;
