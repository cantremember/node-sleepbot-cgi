'use strict';

var Promise = require('bluebird');
var _und = require('underscore');

var theLib = require('../lib/index');


// column -> index mapping
var sampleColumns = 'file ext page stub artist album track size'.split(/\s/).reduce(function(total, column, index) {
    total[column] = index;
    return total;
}, {});
var quipColumns = {
    text: 0,
};

// cached information
var albumCache = {};

// transform row into a property Object keyed by column
var columnMap = function columnMap(row, columns) {
    return Object.keys(columns).reduce(function(map, key) {
        map[key] = row[columns[key]];
        return map;
    }, {});
};

// load the samples file
var loadSamples = function() {
    return theLib.loadWwwCSV('ambience/any.txt').then(function(rows) {
        // memoize
        loadSamples = function() {
            return Promise.resolve(rows);
        };
        return rows;
    });
};

// load the quips file
var loadQuips = function() {
    return theLib.loadWwwCSV('ambience/anyquip.txt').then(function(rows) {
        // memoize
        loadQuips = function() {
            return Promise.resolve(rows);
        };
        return rows;
    });
};

module.exports = function handler(req, res, cb) {
    var quip
    var sample;

    loadSamples().then(function(rows) {
        // choose a random sample
        sample = columnMap(theLib.chooseAny(rows), sampleColumns);

        // we split sample storage into two subdirectories
        sample.dirNum = (/^[m-z]/.test(sample.file) ? 2 : 1);

        // things about the album
        var album = albumCache[sample.stub];
        if (! album) {
            var albumFile = sample.stub.toLowerCase();
            var coverImage = [ '/ambience/covergif/', albumFile, '.gif'].join('');
            album = albumCache[sample.stub] = {
                albumFile:   albumFile,
                albumAnchor: sample.stub.toUpperCase(),
                // has a cover image?
                coverImage:  coverImage,
                coverExists: theLib.wwwHasFile(coverImage),
            };
        }

        sample = _und.extend(sample, album);
    }).then(function() {
        return loadQuips();
    }).then(function(rows) {
        // choose a random quip
        quip = columnMap(theLib.chooseAny(rows), quipColumns);
    }).then(function() {
        return Promise.promisify(res.render, res)('ambienceAnyAlbum.ejs', {
            config: theLib.config,
            sample: sample,
            quip: quip,
        }).then(function(body) {
            res.send(body);
        });
    }).catch(cb).error(cb);
};
