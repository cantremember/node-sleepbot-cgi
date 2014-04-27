'use strict';

var assert = require('assert');
var sinon = require('sinon');
var Promise = require('bluebird');

var theLib = require('../../lib/index');
var theHelper = require('../helper');
var willHandle = require('../../app/ambienceAnySample');


describe('ambienceAnySample', function() {
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


    describe('on success', function() {
        beforeEach(function() {
            sandbox.stub(theLib.wwwRoot, 'willLoadCSV', function(relativePath) {
                switch (relativePath) {
                    case 'ambience/any.txt':
                        return Promise.resolve([
                            'file ext page stub artist album track size'.split(/\s/)
                        ]);
                    case 'ambience/anyquip.txt':
                        return Promise.resolve([
                            'text'.split(/\s/)
                        ]);
                    default:
                        assert(false, pathname);
                }
            });
            sandbox.stub(theLib.wwwRoot, 'hasFile', function(relativePath) {
                assert.equal('/ambience/covergif/stub.gif', relativePath);
                return Promise.resolve(true);
            });
        });

        it('gets a sample and a quip', function(done) {
            willHandle(req, res).then(function() {
                assert.equal(2, theLib.wwwRoot.willLoadCSV.callCount);
                assert.equal(1, theLib.wwwRoot.hasFile.callCount);
                assert(res.render.calledOnce);
                assert(res.send.calledOnce);

                var context = res.render.firstCall.args[1];
                assert.equal('stub', context.sample.stub);
                assert.equal('stub', context.sample.albumFile);
                assert.equal('STUB', context.sample.albumAnchor);
                assert.equal('/ambience/covergif/stub.gif', context.sample.coverImage);
                assert(context.sample.coverExists);
                assert.equal('text', context.quip.text);
            }).nodeify(done);
        });
    });

    it('will fail gracefully', function(done) {
        sandbox.stub(theLib.wwwRoot, 'willLoadCSV').throws(new Error('BOOM'));
        willHandle(req, res).done(theHelper.notCalled, function(err) {
            assert.equal('BOOM', err.message);
            assert(! res.render.called);

            done();
        });
    });
});
