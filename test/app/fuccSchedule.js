'use strict';

var assert = require('assert');
var sinon = require('sinon');
var Promise = require('bluebird');

var theLib = require('../../lib/index');
var theHelper = require('../helper');
var willHandle = require('../../app/fuccSchedule');


describe('fuccSchedule', function() {
    var sandbox;
    var req, res;
    beforeEach(function() {
        // own own private sandbox
        sandbox = sinon.sandbox.create();

        // mock Request & Response
        req = theHelper.mockRequest(sandbox);
        res = theHelper.mockResponse(sandbox);
    });
    afterEach(function() {
        sandbox.restore();
    });


    var date;
    var liveData, livePage;
    var showData, showPage;
    var deadFile;
    beforeEach(function() {
        date = new Date();

        liveData = livePage = undefined;
        showData = showPage = undefined;
        deadFile = undefined;
        sandbox.stub(theLib.wwwRoot, 'willLoadCSV', function(relativePath) {
            switch (relativePath) {
                case 'fucc/live.txt':
                    return Promise.resolve(liveData ? [ liveData ] : []);
                case 'fucc/show.txt':
                    return Promise.resolve(showData ? [ showData ] : []);
                case 'fucc/showquip.txt':
                    return Promise.resolve([
                        'text'.split(/\s/)
                    ]);
                default:
                    assert(false, pathname);
            }
        });
        sandbox.stub(theLib.wwwRoot, 'willLoadFile', function(relativePath) {
            switch (relativePath) {
                case 'fucc/dead.txt':
                    return Promise.resolve(deadFile);
                case 'fucc/live.html':
                    return Promise.resolve(livePage);
                case 'fucc/show.html':
                    return Promise.resolve(showPage);
                default:
                    assert(false, 'not an expected path: ' + relativePath);
            }
        });
    });


    it('knows when the station is dead', function(done) {
        deadFile = 'DEAD';

        willHandle(req, res).then(function() {
            assert.equal(1, theLib.wwwRoot.willLoadFile.callCount);
            assert.equal(1, theLib.wwwRoot.willLoadCSV.callCount);
            assert(res.render.calledOnce);
            assert(res.send.calledOnce);

            var context = res.render.firstCall.args[1];
            assert.equal('DEAD', context.dead);
            assert(! context.current);
            assert.equal('text', context.quip.text);
        }).nodeify(done);
    });

    it('knows when the station has a live event', function(done) {
        liveData = [
            'file', 'anchor',
            '' + date.getYear(), '' + date.getMonth(), '' + date.getDate(),
            '' + date.getHours(), '' + (date.getHours() + 1)
        ].map(function(v) { return '' + v; });
        livePage = [
            'before',
            '<A NAME="anchor">',
            'body1',
            'body2',
            'body3',
            '<A NAME="another">',
            'after',
        ].join("\n");

        willHandle(req, res).then(function() {
            assert.equal(2, theLib.wwwRoot.willLoadFile.callCount);
            assert.equal(2, theLib.wwwRoot.willLoadCSV.callCount);
            assert(res.render.calledOnce);
            assert(res.send.calledOnce);

            var context = res.render.firstCall.args[1];
            assert(! context.dead);
            assert.equal('live', context.current.type);
            assert.equal('anchor', context.current.anchor);
            assert.equal(date.getFullYear(), context.current.year);
            assert.equal("body1\nbody2\nbody3", context.current.body);
            assert(! context.current.title);
            assert.equal('text', context.quip.text);
        }).nodeify(done);
    });

    it('knows when the station has a show', function(done) {
        showData = [
            'file', 'anchor',
            '' + date.getDay(),
            '' + date.getHours(), '' + (date.getHours() + 1)
        ].map(function(v) { return '' + v; });
        showPage = [
            'before',
            '<A NAME="anchor">',
            'body1',
            'body2',
            '<!-- start -->',
            'title',
            'body3',
            '<!-- end -->',
            'after',
        ].join("\n");

        willHandle(req, res).then(function() {
            assert.equal(3, theLib.wwwRoot.willLoadFile.callCount);
            assert.equal(3, theLib.wwwRoot.willLoadCSV.callCount);
            assert(res.render.calledOnce);
            assert(res.send.calledOnce);

            var context = res.render.firstCall.args[1];
            assert(! context.dead);
            assert.equal('show', context.current.type);
            assert.equal('anchor', context.current.anchor);
            assert.equal(date.getDay(), context.current.dayOfWeek);
            assert.equal("body1\nbody2\nbody3", context.current.body);
            assert.equal('title', context.current.title);
            assert.equal('text', context.quip.text);
        }).nodeify(done);
    });

    it('knows when it is being told nothing useful', function(done) {
        willHandle(req, res).then(function() {
            assert.equal(3, theLib.wwwRoot.willLoadFile.callCount);
            assert.equal(3, theLib.wwwRoot.willLoadCSV.callCount);
            assert(res.render.calledOnce);
            assert(res.send.calledOnce);

            var context = res.render.firstCall.args[1];
            assert(! context.dead);
            assert(! context.current);
            assert.equal('text', context.quip.text);
        }).nodeify(done);
    });

    it('will fail gracefully', function(done) {
        theLib.wwwRoot.willLoadFile.restore();
        sandbox.stub(theLib.wwwRoot, 'willLoadFile').throws(new Error('BOOM'));

        willHandle(req, res).done(theHelper.notCalled, function(err) {
            assert.equal('BOOM', err.message);
            assert(! res.render.called);

            done();
        });
    });
});
