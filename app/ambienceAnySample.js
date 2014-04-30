'use strict';

var Promise = require('bluebird');
var _und = require('underscore');

var theLib = require('../lib/index');


// column -> index mapping
var sampleColumns = theLib.columnToIndexMap('file ext page stub artist album track size');
var quipColumns = theLib.columnToIndexMap('text');

// cached information
var albumCache = {};

// load the samples file
var loadSamples = theLib.willMemoize(function() {
    return theLib.wwwRoot.willLoadCSV('ambience/any.txt').then(function(rows) {
        return rows.map(function(row) {
            return theLib.dataColumnMap(row, sampleColumns);
        });
    });
});

// load the quips file
var loadQuips = theLib.willMemoize(function() {
    return theLib.wwwRoot.willLoadCSV('ambience/anyquip.txt').then(function(rows) {
        return rows.map(function(row) {
            return theLib.dataColumnMap(row, quipColumns);
        });
    });
});


module.exports = function handler(req, res, cb) {
    var quip;
    var sample;

    return loadSamples().then(function(datas) {
        // choose a random sample
        sample = theLib.chooseAny(datas);

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
                coverExists: theLib.wwwRoot.hasFile(coverImage),
            };
        }

        sample = _und.extend(sample, album);

        return loadQuips();
    }).then(function(datas) {
        // choose a random quip
        quip = theLib.chooseAny(datas);
    }).then(function() {
        return Promise.promisify(res.render, res)('ambienceAnySample.ejs', {
            config: theLib.config,
            sample: sample,
            quip: quip,
        });
    }).then(function(body) {
        res.send(body);
    }).error(theLib.callbackAndThrowError(cb));
};
