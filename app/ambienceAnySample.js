'use strict';

var Promise = require('bluebird');
var lodash = require('lodash');

var theLib = require('../lib/index');

// column -> index mapping
var sampleColumns = theLib.columnToIndexMap('file ext page stub artist album track size');
var quipColumns = theLib.columnToIndexMap('text');

var NO_ROWS = Object.freeze([]);
var FAKE_QUIP = Object.freeze({ text: '' });


// load the samples file
var loadSamples = theLib.willMemoize(function() {
    return theLib.wwwRoot.willLoadTSV('ambience/any.txt')
    .then(function(rows) {
        return rows.map(function(row) {
            return theLib.dataColumnMap(row, sampleColumns);
        });
    })
    .catch(function() {
        // treat as no match
        return NO_ROWS;
    });
});

// load the quips file
var loadQuips = theLib.willMemoize(function() {
    return theLib.wwwRoot.willLoadTSV('ambience/anyquip.txt')
    .then(function(rows) {
        return rows.map(function(row) {
            return theLib.dataColumnMap(row, quipColumns);
        });
    })
    .catch(function() {
        // treat as no match
        return NO_ROWS;
    });
});


/**
 * Generates a random page from [Ambience for the Masses](http://sleepbot.com/ambience/cgi/any_f.cgi)
 *
 * &nbsp;
 *
 * @see http://sleepbot.com/ambience/cgi/any_f.cgi
 * @function app.ambienceAnySample
 * @params {express.request} req
 * @params {express.response} res
 * @params {Function} cb a callback invoked to continue down the Express middleware pipeline
 * @returns {Promise<express.response>} a Promise resolving `res`
 */
function handler(req, res, cb) {
    var quip;
    var sample;

    return Promise.all([
        // (1) the sample
        loadSamples()
        .then(function(datas) {
            // choose a random sample
            sample = theLib.chooseAny(datas);
            if (sample === undefined) {
                return;
            }

            // we split sample storage into two subdirectories
            sample.dirNum = (/^[m-z]/.test(sample.file) ? 2 : 1);

            // things about the album
            var stub = sample.stub;
            var album = handler.cache[stub];

            if (album) {
                // already cached
                sample = lodash.defaults(sample, album);
                return;
            }

            // populate the cache
            var albumFile = stub.toLowerCase();
            var coverImage = [ '/ambience/covergif/', albumFile, '.gif'].join('');
            album = {
                albumFile:   albumFile,
                albumAnchor: stub.toUpperCase(),
                // has a cover image?
                coverImage:  coverImage,
                coverExists: false,
            };

            if (theLib.config.get('caching')) {
                // cache
                handler.cache[stub] = album;
            }

            return theLib.wwwRoot.willDetectFile(coverImage)
            .then(function(exists) {
                album.coverExists = exists;

                sample = lodash.defaults(sample, album);
            });
        }),

        // (2) the quip
        loadQuips()
        .then(function(datas) {
            // choose a random quip
            quip = theLib.chooseAny(datas);
        })
    ])
    .then(function() {
        if (sample === undefined) {
            // we cannot provide a response
            //   nor are we releasing Zalgo
            return cb && cb(null);
        }

        if (quip === undefined) {
            quip = FAKE_QUIP;
        }

        return Promise.promisify(res.render, res)('ambienceAnySample.ejs', {
            config: theLib.config,
            sample: sample,
            quip: quip,
        })
        .then(function(body) {
            res.send(body);
        });
    })
    .return(res)
    .catch(theLib.callbackAndThrowError(cb));
}

/**
 * Flushes the cache
 *
 * @memberof app.ambienceAnySample
 * @function forget
 */
handler.forget = function forget() {
    this.cache = {};
};
handler.forget();


module.exports = handler;
