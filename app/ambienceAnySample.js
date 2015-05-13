'use strict';

var Promise = require('bluebird');
var _und = require('underscore');

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
                sample = _und.defaults(sample, album);
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

            if (theLib.config.caching) {
                // cache
                handler.cache[stub] = album;
            }

            return theLib.wwwRoot.willDetectFile(coverImage)
            .then(function(exists) {
                album.coverExists = exists;

                sample = _und.defaults(sample, album);
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
    .catch(theLib.callbackAndThrowError(cb));
}

// cached information
handler.forget = function forget() {
    this.cache = {};
};
handler.forget();


module.exports = handler;
