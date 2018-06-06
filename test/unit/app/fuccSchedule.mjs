import assert from 'assert';
import sinon from 'sinon';
import mockfs from 'mock-fs';
import httpMocks from 'node-mocks-http';
import moment from 'moment';

import wwwRoot from '../../../lib/wwwRoot';
import willHandle from '../../../app/fuccSchedule';


// aligned to Date() local time
const NOW = moment();
const MOMENT_SHOW = moment('2001-01-01T01:00:00Z').add(NOW.utcOffset(), 'minutes');
const MOMENT_LIVE = moment('2002-02-02T02:00:00Z').add(NOW.utcOffset(), 'minutes');

const NO_DATA = Buffer.alloc(0);

const SHOW_DATA = `
FILE\tANCHOR\tDAY_OF_WEEK\tHOUR_START\tHOUR_END
file\tanchor\t${
  MOMENT_SHOW.day() /* of week */ }\t${
  MOMENT_SHOW.hour() }\t${ MOMENT_SHOW.clone().add(1, 'hour').hour()
}
`;
const SHOW_HTML = `
before
<A NAME="anchor">
show1
show2
<!-- start -->
title
show3
<!-- end -->
<A NAME="different">
after
`;

const LIVE_DATA = `
FILE\tANCHOR\tYEAR\tMONTH\tDAY\tHOUR_START\tHOUR_END
file\tanchor\t${
  MOMENT_LIVE.year() }\t${ MOMENT_LIVE.month() }\t${ MOMENT_LIVE.date() }\t${
  MOMENT_LIVE.hour() }\t${ MOMENT_LIVE.clone().add(1, 'hour').hour()
}
`;
const LIVE_HTML = `
before
<A NAME="anchor">
live1
live2
live3
<A NAME="different">
after
`;

const QUIP_DATA = `
text
text
`;



describe('fuccSchedule', () => {
  const sandbox = sinon.createSandbox();
  let clock;
  let cb;
  let req;
  let res;

  beforeEach(() => {
    cb = sandbox.spy();
    clock = sandbox.useFakeTimers({
      now: 0,
      toFake: [ 'Date' ], // nothing that touches Promises / the uv_loop
    });

    // mock Request & Response
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();

    sandbox.spy(wwwRoot, 'willLoadTSV');
    sandbox.spy(wwwRoot, 'willLoadFile');
  });
  afterEach(() => {
    sandbox.restore();
    clock.restore();

    mockfs.restore();
  });


  it('knows when the station is dead', () => {
    mockfs({ '/mock-fs': {
      'fucc': {
        'dead.txt': 'DEAD',
        'showquip.txt': QUIP_DATA,
      }
    } });

    return willHandle(req, res, cb)
    .then((_res) => {
      // it resolves the Response
      assert.equal(_res, res);

      assert.equal(wwwRoot.willLoadFile.callCount, 1);
      assert.equal(wwwRoot.willLoadTSV.callCount, 1);

      assert(! cb.called);
      assert.equal(res._getData(), 'fuccSchedule.ejs');
      assert.equal(res.statusCode, 200);

      const context = res._getRenderData();
      assert.equal(context.dead, 'DEAD');
      assert(! context.current);
      assert.equal(context.quip.text, 'text');
    });
  });

  it('knows when the station has a live event', () => {
    mockfs({ '/mock-fs': {
      'fucc': {
        'live.txt': LIVE_DATA,
        'live.html': LIVE_HTML,
        'show.txt': SHOW_DATA,
        'show.html': NO_DATA,
        'showquip.txt': QUIP_DATA,
      }
    } });

    // live
    clock.tick(MOMENT_LIVE.valueOf());

    return willHandle(req, res, cb)
    .then(() => {
      assert.equal(wwwRoot.willLoadFile.callCount, 2);
      assert.equal(wwwRoot.willLoadTSV.callCount, 2);

      assert(! cb.called);
      assert.equal(res._getData(), 'fuccSchedule.ejs');

      const context = res._getRenderData();
      assert(! context.dead);
      assert.equal(context.current.type, 'live');
      assert.equal(context.current.anchor, 'anchor');
      assert.equal(context.current.year, MOMENT_LIVE.year());
      assert.equal(context.current.body, 'live1\nlive2\nlive3');
      assert.strictEqual(context.current.title, undefined);
      assert.equal(context.quip.text, 'text');
    });
  });

  it('knows when the station has a show', () => {
    mockfs({ '/mock-fs': {
      'fucc': {
        'live.txt': LIVE_DATA,
        'live.html': NO_DATA,
        'show.txt': SHOW_DATA,
        'show.html': SHOW_HTML,
        'showquip.txt': QUIP_DATA,
      }
    } });

    // a show
    clock.tick(MOMENT_SHOW.valueOf());

    return willHandle(req, res, cb)
    .then(() => {
      assert.equal(wwwRoot.willLoadFile.callCount, 3);
      assert.equal(wwwRoot.willLoadTSV.callCount, 3);

      assert(! cb.called);
      assert.equal(res._getData(), 'fuccSchedule.ejs');

      const context = res._getRenderData();
      assert(! context.dead);
      assert.equal(context.current.type, 'show');
      assert.equal(context.current.anchor, 'anchor');
      assert.equal(context.current.dayOfWeek, MOMENT_SHOW.day());
      assert.equal(context.current.body, 'show1\nshow2\nshow3');
      assert.equal(context.current.title, 'title');
      assert.equal(context.quip.text, 'text');
    });
  });

  it('knows when it is being told nothing useful', () => {
    mockfs({ '/mock-fs': {
      'fucc': {
        'live.txt': LIVE_DATA,
        'live.html': NO_DATA,
        'show.txt': SHOW_DATA,
        'show.html': NO_DATA,
        'showquip.txt': QUIP_DATA,
      }
    } });

    // off-schedule
    clock.tick(NOW.valueOf());

    return willHandle(req, res, cb)
    .then(() => {
      assert.equal(wwwRoot.willLoadFile.callCount, 3);
      assert.equal(wwwRoot.willLoadTSV.callCount, 3);

      assert(! cb.called);
      assert.equal(res._getData(), 'fuccSchedule.ejs');

      const context = res._getRenderData();
      assert(! context.dead);
      assert(! context.current);
      assert.equal(context.quip.text, 'text');
    });
  });

  it('fails on missing quips', () => {
    mockfs({ '/mock-fs': {
      'fucc': {
        'show.txt': SHOW_DATA,
        'show.html': SHOW_HTML,
      }
    } });

    return willHandle(req, res, cb)
    .then(() => {
      const err = cb.args[0][0];
      assert(err.message.match(/ENOENT/));

      // it('will fail gracefully')
    });
  });

  it('survives missing everything EXCEPT quips', () => {
    mockfs({ '/mock-fs': {
      'fucc': {
        'showquip.txt': QUIP_DATA,
      }
    } });

    return willHandle(req, res, cb)
    .then(() => {
      assert(! cb.called);
      assert.equal(res._getData(), 'fuccSchedule.ejs');

      const context = res._getRenderData();
      assert(! context.dead);
      assert(! context.current);
    });
  });

  it('will fail gracefully', () => {
    mockfs({ '/mock-fs': {
      'fucc': {
        'showquip.txt': QUIP_DATA,
        'show.txt': SHOW_DATA,
        'show.html': SHOW_HTML,
      }
    } });

    sandbox.stub(res, 'render').throws(new Error('BOOM'));
    sandbox.spy(res, 'send');

    return willHandle(req, res, cb)
    .then((_res) => {
      // it resolves the Response
      assert.equal(_res, res);

      assert(res.render.calledOnce);
      assert(! res.send.called);

      // Express gets informed
      assert(cb.called);

      const err = cb.args[0][0];
      assert.equal(err.message, 'BOOM');
    });
  });
});
