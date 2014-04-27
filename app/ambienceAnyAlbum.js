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
    return theLib.wwwRoot.willLoadCSV('ambience/any.txt');
});

// load the quips file
var loadQuips = theLib.willMemoize(function() {
    return theLib.wwwRoot.willLoadCSV('ambience/anyquip.txt');
});


module.exports = function handler(req, res, cb) {
    var quip;
    var sample;

    return loadSamples().then(function(rows) {
        // choose a random sample
        sample = theLib.dataColumnMap(theLib.chooseAny(rows), sampleColumns);

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
    }).then(function() {
        return loadQuips();
    }).then(function(rows) {
        // choose a random quip
        quip = theLib.dataColumnMap(theLib.chooseAny(rows), quipColumns);
    }).then(function() {
        return Promise.promisify(res.render, res)('ambienceAnyAlbum.ejs', {
            config: theLib.config,
            sample: sample,
            quip: quip,
        });
    }).then(function(body) {
        res.send(body);
    }).error(theLib.callbackAndThrowError(cb));
};
