import assert from 'assert';
import sinon from 'sinon';
import httpMocks from 'node-mocks-http';
import net from 'net';
import events from 'events';
import util from 'util';

import theHelper from '../../helper';
import willHandle from '../../../app/WRLDtimeUTC';


// mock net.Connection
function Connection(story) {
  events.EventEmitter.call(this);

  const self = this;
  setImmediate(() => {
    story.call(self);
  });
}
util.inherits(Connection, events.EventEmitter);
Connection.prototype.setTimeout = function(t) {
  this.timeout = t;
};

// Connection stories
function CONNECTION_CLOSE() {
  this.emit('data', Buffer.from('DATA'));
  this.emit('data', Buffer.from('CLOSE'));
  this.emit('close');
}
function CONNECTION_END() {
  this.emit('data', Buffer.from('DATA'));
  this.emit('data', Buffer.from('END'));
  this.emit('end');
}
function CONNECTION_EMPTY() {
  this.emit('close');
  this.emit('end');
  this.emit('data', Buffer.from('IGNORE'));
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


describe('WRLDtimeUTC', () => {
  const sandbox = sinon.createSandbox();
  let cb;
  let req;
  let res;

  // we should always release all Connection listeners
  let connection;
  let listenerCount;
  function setConnection(_connection) {
    connection = _connection;
    listenerCount = connection.listeners().length;
  }

  beforeEach(() => {
    connection = undefined;
    listenerCount = 0;

    cb = sandbox.spy();

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


  it('responds when the Connection provides data and closes', () => {
    theHelper.mockConfig({ ntpServers: [ 'ntp-good' ] });

    sandbox.stub(net, 'connect').callsFake((port, host) => {
      assert.equal(host, 'ntp-good');
      assert.equal(port, 13); // ntp

      connection = new Connection(CONNECTION_CLOSE);
      setConnection(connection);
      return connection;
    });

    return willHandle(req, res, cb)
    .then(() => {
      assert(! cb.called);
      assert(net.connect.calledOnce);

      assert.equal(res.statusCode, 200);
      assert.equal(res._getData(), 'DATA\nCLOSE');
    });
  });

  it('responds when the Connection provides data and ends', () => {
    theHelper.mockConfig({ ntpServers: [ 'ntp-good' ] });

    sandbox.stub(net, 'connect').callsFake(() => {
      connection = new Connection(CONNECTION_END);
      setConnection(connection);
      return connection;
    });

    return willHandle(req, res, cb)
    .then(() => {
      assert(! cb.called);
      assert(net.connect.calledOnce);

      assert.equal(res.statusCode, 200);
      assert.equal(res._getData(), 'DATA\nEND');
    });
  });

  it('does nothing without servers', () => {
    theHelper.mockConfig({ ntpServers: [] });

    sandbox.spy(net, 'connect');

    return willHandle(req, res, cb)
    .then(() => {
      assert(! cb.called);
      assert(! net.connect.called);

      assert.equal(res.statusCode, 503);
      assert.strictEqual(res._getData(), '');
    });
  });

  it('does nothing without a Connection response', () => {
    theHelper.mockConfig({ ntpServers: [ 'ntp-bad' ] });

    sandbox.stub(net, 'connect').callsFake(() => {
      connection = new Connection(CONNECTION_EMPTY);
      setConnection(connection);
      return connection;
    });

    return willHandle(req, res, cb)
    .then(() => {
      assert(! cb.called);
      assert(net.connect.calledOnce);

      assert.equal(res.statusCode, 503);
      assert.strictEqual(res._getData(), '');
    });
  });

  it('does nothing with a series of bad Connections', () => {
    theHelper.mockConfig({ ntpServers: [ 'ntp-1', 'ntp-2', 'ntp-3' ] });

    const connections = [];
    sandbox.stub(net, 'connect').callsFake(() => {
      const index = connections.length;
      switch (index) {
        case 0:  connections.push(new Connection(CONNECTION_ERROR));         break;
        case 1:  connections.push(new Connection(CONNECTION_TIMEOUT));       break;
        case 2:  connections.push(new Connection(CONNECTION_ERROR_TIMEOUT)); break;
        default:
      }
      return connections[index];
    });

    return willHandle(req, res, cb)
    .then(() => {
      assert(! cb.called);
      assert.equal(net.connect.callCount, 3);
      assert.equal(connections.length, 3);

      assert.equal(res.statusCode, 503);
      assert.strictEqual(res._getData(), '');
    });
  });

  it('falls back to an alternate server', () => {
    theHelper.mockConfig({ ntpServers: [ 'ntp-1', 'ntp-2', 'ntp-3' ] });

    const connections = [];
    sandbox.stub(net, 'connect').callsFake(() => {
      const index = connections.length;
      switch (index) {
        case 0:  connections.push(new Connection(CONNECTION_ERROR));  break;
        case 1:  connections.push(new Connection(CONNECTION_EMPTY));  break;
        case 2:  connections.push(new Connection(CONNECTION_CLOSE));  break;
        default:
      }
      return connections[index];
    });

    return willHandle(req, res, cb)
    .then(() => {
      assert(! cb.called);
      assert.equal(net.connect.callCount, 3);
      assert.equal(connections.length, 3);

      assert.equal(res.statusCode, 200);
      assert.equal(res._getData(), 'DATA\nCLOSE');
    });
  });

  it('will fail gracefully', () => {
    sandbox.stub(net, 'connect').throws(new Error('BOOM'));
    sandbox.spy(res, 'send');

    return willHandle(req, res, cb)
    .then(() => {
      assert(net.connect.calledOnce);
      assert(! res.send.called);

      // Express gets informed
      assert(cb.called);

      const err = cb.args[0][0];
      assert.equal(err.message, 'BOOM');
    });
  });
});
