'use strict';

var assert = require('assert');
var sinon = require('sinon');
var Promise = require('bluebird');

var theLib = require('../../lib/index');
var theHelper = require('../helper');
var willHandle = require('../../app/morganLayout');

var cardDataAll = [
    [ "1",  "one",   "ONE"   ],
    [ "2",  "two",   "TWO"   ],
    [ "3",  "three", "THREE" ],
    [ "4",  "four",  "FOUR"  ],
    [ "5",  "five",  "FIVE"  ],
    [ "6",  "six",   "SIX"   ],
    [ "7",  "seven", "SEVEN" ],
    [ "8",  "eight", "EIGHT" ],
    [ "9",  "nine",  "NINE"  ],
    [ "10", "ten",   "TEN"   ],
];


describe('morganLayout', function() {
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


    var cardData;
    beforeEach(function() {
        cardData = undefined;
        sandbox.stub(theLib.wwwRoot, 'willLoadCSV', function(relativePath) {
            switch (relativePath) {
                case 'morgan/card.txt':
                    return Promise.resolve(cardData ? cardData : []);
                default:
                    assert(false, pathname);
            }
        });
    });


    it('displays three cards by default', function(done) {
        cardData = cardDataAll;

        willHandle(req, res).then(function() {
            assert.equal(1, theLib.wwwRoot.willLoadCSV.callCount);
            assert(res.render.calledOnce);
            assert(res.send.calledOnce);

            var context = res.render.firstCall.args[1];
            assert.equal(3, context.cards.length);
            assert(context.quip.text);
        }).nodeify(done);
    });

    it('displays at least 1 card', function(done) {
        cardData = cardDataAll;
        req.params.cards = 0;

        willHandle(req, res).then(function() {
            var context = res.render.firstCall.args[1];
            assert.equal(1, context.cards.length);
        }).nodeify(done);
    });

    it('displays at most 10 cards', function(done) {
        cardData = cardDataAll;
        req.params.cards = 99;

        willHandle(req, res).then(function() {
            var context = res.render.firstCall.args[1];
            assert.equal(10, context.cards.length);
        }).nodeify(done);
    });

    it('will not display more cards that it has', function(done) {
        cardData = cardDataAll.slice(0, 3);
        req.params.cards = 99;

        willHandle(req, res).then(function() {
            var context = res.render.firstCall.args[1];
            assert.equal(3, context.cards.length);
        }).nodeify(done);
    });

    it('will fail gracefully', function(done) {
        theLib.wwwRoot.willLoadCSV.restore();
        sandbox.stub(theLib.wwwRoot, 'willLoadCSV').throws(new Error('BOOM'));

        willHandle(req, res).done(theHelper.notCalled, function(err) {
            assert.equal('BOOM', err.message);
            assert(! res.render.called);

            done();
        });
    });
});
