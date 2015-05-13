'use strict';

var assert = require('assert');
var sinon = require('sinon');
var httpMocks = require('node-mocks-http');
var net = require('net');
var events = require('events');
var util = require('util');

var theHelper = require('../helper');
var willHandle = require('../../app/WRLDtimeUTC');


// mock net.Connection
function Connection(story) {
    events.EventEmitter.call(this);

    var self = this;
    setImmediate(function() {
        story.call(self);
    });
}
util.inherits(Connection, events.EventEmitter);
Connection.prototype.setTimeout = function setTimeout(t) {
    this.timeout = t;
};

// Connection stories
function CONNECTION_CLOSE() {
    this.emit('data', new Buffer('DATA'));
    this.emit('data', new Buffer('CLOSE'));
    this.emit('close');
}
function CONNECTION_END() {
    this.emit('data', new Buffer('DATA'));
    this.emit('data', new Buffer('END'));
    this.emit('end');
}
function CONNECTION_EMPTY() {
    this.emit('close');
    this.emit('end');
    this.emit('data', new Buffer('IGNORE'));
}
function CONNECTION_ERROR() {
    this.emit('error', new Error('BOOM'));
}
function CONNECTION_TIMEOUT() {
    this.emit('timeout');
}
function CONNECTION_ERROR_TIMEOUT() {
    this.emit('timeout');
    this.emit('error', new Error('BOOM'));
}


describe('WRLDtimeUTC', function() {
    var sandbox;
    var cb;
    var req, res;

    beforeEach(function() {
        // own own private sandbox
        sandbox = sinon.sandbox.create();
        cb = sandbox.spy();

        // mock Request & Response
        req = httpMocks.createRequest();
        res = httpMocks.createResponse();
    });
    afterEach(function() {
        sandbox.restore();
        theHelper.mockConfig();
    });


    it('responds when the Connection provides data and closes', function() {
        theHelper.mockConfig({ ntpServers: [ 'ntp-good' ] });

        var connection;
        sandbox.stub(net, 'connect', function(port, host) {
            assert.equal(host, 'ntp-good');
            assert.equal(port, 13); // ntp

            connection = new Connection(CONNECTION_CLOSE);
            return connection;
        });

        return willHandle(req, res, cb)
        .then(function() {
            assert(! cb.called);
            assert(net.connect.calledOnce);

            assert.equal(res.statusCode, 200);
            assert.equal(res._getData(), 'DATA\nCLOSE');
        });
    });

    it('responds when the Connection provides data and ends', function() {
        theHelper.mockConfig({ ntpServers: [ 'ntp-good' ] });

        var connection;
        sandbox.stub(net, 'connect', function() {
            connection = new Connection(CONNECTION_END);
            return connection;
        });

        return willHandle(req, res, cb)
        .then(function() {
            assert(! cb.called);
            assert(net.connect.calledOnce);

            assert.equal(res.statusCode, 200);
            assert.equal(res._getData(), 'DATA\nEND');
        });
    });

    it('does nothing without servers', function() {
        theHelper.mockConfig({ ntpServers: [] });

        sandbox.spy(net, 'connect');

        return willHandle(req, res, cb)
        .then(function() {
            assert(! cb.called);
            assert(! net.connect.called);

            assert.equal(res.statusCode, 503);
            assert.strictEqual(res._getData(), '');
        });
    });

    it('does nothing without a Connection response', function() {
        theHelper.mockConfig({ ntpServers: [ 'ntp-bad' ] });

        var connection;
        sandbox.stub(net, 'connect', function() {
            connection = new Connection(CONNECTION_EMPTY);
            return connection;
        });

        return willHandle(req, res, cb)
        .then(function() {
            assert(! cb.called);
            assert(net.connect.calledOnce);

            assert.equal(res.statusCode, 503);
            assert.strictEqual(res._getData(), '');
        });
    });

    it('does nothing with a series of bad Connections', function() {
        theHelper.mockConfig({ ntpServers: [ 'ntp-1', 'ntp-2', 'ntp-3' ] });

        var connections = [];
        sandbox.stub(net, 'connect', function() {
            var index = connections.length;
            switch (index) {
                case 0:  connections.push(new Connection(CONNECTION_ERROR));         break;
                case 1:  connections.push(new Connection(CONNECTION_TIMEOUT));       break;
                case 2:  connections.push(new Connection(CONNECTION_ERROR_TIMEOUT)); break;
            }
            return connections[index];
        });

        return willHandle(req, res, cb)
        .then(function() {
            assert(! cb.called);
            assert.equal(net.connect.callCount, 3);
            assert.equal(connections.length, 3);

            assert.equal(res.statusCode, 503);
            assert.strictEqual(res._getData(), '');
        });
    });

    it('falls back to an alternate server', function() {
        theHelper.mockConfig({ ntpServers: [ 'ntp-1', 'ntp-2', 'ntp-3' ] });

        var connections = [];
        sandbox.stub(net, 'connect', function() {
            var index = connections.length;
            switch (index) {
                case 0:  connections.push(new Connection(CONNECTION_ERROR));  break;
                case 1:  connections.push(new Connection(CONNECTION_EMPTY));  break;
                case 2:  connections.push(new Connection(CONNECTION_CLOSE));  break;
            }
            return connections[index];
        });

        return willHandle(req, res, cb)
        .then(function() {
            assert(! cb.called);
            assert.equal(net.connect.callCount, 3);
            assert.equal(connections.length, 3);

            assert.equal(res.statusCode, 200);
            assert.equal(res._getData(), 'DATA\nCLOSE');
        });
    });

    it('will fail gracefully', function() {
        sandbox.stub(net, 'connect').throws(new Error('BOOM'));
        sandbox.spy(res, 'send');

        return willHandle(req, res, cb)
        .then(theHelper.notCalled, function(err) {
            assert.equal(err.message, 'BOOM');

            assert(net.connect.calledOnce);
            assert(! res.send.called);

            // Express gets informed
            assert(cb.called);
            assert.strictEqual(cb.args[0][0], err);
        });
    });
});
