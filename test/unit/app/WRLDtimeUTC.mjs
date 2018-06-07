import assert from 'assert';
import sinon from 'sinon';
import httpMocks from 'node-mocks-http';
import net from 'net';
import events from 'events';
import util from 'util';

import theHelper from '../../helper';
import middleware from '../../../app/WRLDtimeUTC';


// mock net.Connection
function MockConnection(story) {
  events.EventEmitter.call(this);

  const self = this;
  setImmediate(() => {
    story.call(self);
  });
}
util.inherits(MockConnection, events.EventEmitter);
MockConnection.prototype.setTimeout = function(t) {
  this.timeout = t;
};

/* eslint-disable no-invalid-this */
// Connection stories
function _CONNECTION_CLOSE() {
  this.emit('data', Buffer.from('DATA'));
  this.emit('data', Buffer.from('CLOSE'));
  this.emit('close');
}
function _CONNECTION_END() {
  this.emit('data', Buffer.from('DATA'));
  this.emit('data', Buffer.from('END'));
  this.emit('end');
}
function _CONNECTION_EMPTY() {
  this.emit('close');
  this.emit('end');
  this.emit('data', Buffer.from('IGNORE'));
}
function _CONNECTION_ERROR() {
  this.emit('error', new Error('BOOM'));
}
function _CONNECTION_TIMEOUT() {
  this.emit('timeout');
}
function _CONNECTION_ERROR_TIMEOUT() {
  this.emit('timeout');
  this.emit('error', new Error('BOOM'));
}
/* eslint-enable no-invalid-this */


describe('WRLDtimeUTC', () => {
  const sandbox = sinon.createSandbox();
  let next;
  let req;
  let res;

  // we should always release all Connection listeners
  let connection;
  let listenerCount;
  function _setConnection(_connection) {
    connection = _connection;
    listenerCount = connection.listeners().length;
  }

  beforeEach(() => {
    connection = undefined;
    listenerCount = 0;

    next = sandbox.spy();

    // mock Request & Response
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
  });
  afterEach(() => {
    sandbox.restore();
    theHelper.mockConfig();

    if (connection) {
      assert.equal(connection.listeners().length, listenerCount);
    }
  });


  it('responds when the Connection provides data and closes', async () => {
    theHelper.mockConfig({ ntpServers: [ 'ntp-good' ] });

    sandbox.stub(net, 'connect').callsFake((port, host) => {
      assert.equal(host, 'ntp-good');
      assert.equal(port, 13); // ntp

      connection = new MockConnection(_CONNECTION_CLOSE);
      _setConnection(connection);
      return connection;
    });

    // it resolves the Response
    const returned = await middleware(req, res, next);
    assert.equal(returned, res);

    assert(! next.called);
    assert(net.connect.calledOnce);

    assert.equal(res.statusCode, 200);
    assert.equal(res._getData(), 'DATA\nCLOSE');
  });

  it('responds when the Connection provides data and ends', async () => {
    theHelper.mockConfig({ ntpServers: [ 'ntp-good' ] });

    sandbox.stub(net, 'connect').callsFake(() => {
      connection = new MockConnection(_CONNECTION_END);
      _setConnection(connection);
      return connection;
    });

    await middleware(req, res, next);

    assert(! next.called);
    assert(net.connect.calledOnce);

    assert.equal(res.statusCode, 200);
    assert.equal(res._getData(), 'DATA\nEND');
  });

  it('does nothing without servers', async () => {
    theHelper.mockConfig({ ntpServers: [] });

    sandbox.spy(net, 'connect');

    await middleware(req, res, next);

    assert(! next.called);
    assert(! net.connect.called);

    assert.equal(res.statusCode, 503);
    assert.strictEqual(res._getData(), '');
  });

  it('does nothing without a Connection response', async () => {
    theHelper.mockConfig({ ntpServers: [ 'ntp-bad' ] });

    sandbox.stub(net, 'connect').callsFake(() => {
      connection = new MockConnection(_CONNECTION_EMPTY);
      _setConnection(connection);
      return connection;
    });

    await middleware(req, res, next);

    assert(! next.called);
    assert(net.connect.calledOnce);

    assert.equal(res.statusCode, 503);
    assert.strictEqual(res._getData(), '');
  });

  it('does nothing with a series of bad Connections', async () => {
    theHelper.mockConfig({ ntpServers: [ 'ntp-1', 'ntp-2', 'ntp-3' ] });

    const connections = [];
    sandbox.stub(net, 'connect').callsFake(() => {
      const index = connections.length;
      switch (index) {
        case 0:  connections.push(new MockConnection(_CONNECTION_ERROR));         break;
        case 1:  connections.push(new MockConnection(_CONNECTION_TIMEOUT));       break;
        case 2:  connections.push(new MockConnection(_CONNECTION_ERROR_TIMEOUT)); break;
        default:
      }
      return connections[index];
    });

    await middleware(req, res, next);

    assert(! next.called);
    assert.equal(net.connect.callCount, 3);
    assert.equal(connections.length, 3);

    assert.equal(res.statusCode, 503);
    assert.strictEqual(res._getData(), '');
  });

  it('falls back to an alternate server', async () => {
    theHelper.mockConfig({ ntpServers: [ 'ntp-1', 'ntp-2', 'ntp-3' ] });

    const connections = [];
    sandbox.stub(net, 'connect').callsFake(() => {
      const index = connections.length;
      switch (index) {
        case 0:  connections.push(new MockConnection(_CONNECTION_ERROR));  break;
        case 1:  connections.push(new MockConnection(_CONNECTION_EMPTY));  break;
        case 2:  connections.push(new MockConnection(_CONNECTION_CLOSE));  break;
        default:
      }
      return connections[index];
    });

    await middleware(req, res, next);

    assert(! next.called);
    assert.equal(net.connect.callCount, 3);
    assert.equal(connections.length, 3);

    assert.equal(res.statusCode, 200);
    assert.equal(res._getData(), 'DATA\nCLOSE');
  });

  it('will fail gracefully', async () => {
    sandbox.stub(net, 'connect').throws(new Error('BOOM'));
    sandbox.spy(res, 'send');

    // it resolves the Response
    const returned = await middleware(req, res, next);
    assert.equal(returned, res);

    assert(net.connect.calledOnce);
    assert(! res.send.called);

    // Express gets informed
    assert(next.called);

    const err = next.args[0][0];
    assert.equal(err.message, 'BOOM');
  });
});
