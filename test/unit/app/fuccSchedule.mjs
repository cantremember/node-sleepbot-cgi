import assert from 'assert';
import sinon from 'sinon';
import mockfs from 'mock-fs';
import httpMocks from 'node-mocks-http';
import moment from 'moment';

import theLib from '../../../lib/index.mjs';
import {
  default as middleware,
  willLoadDead,
  willLoadLives,
  willLoadShows,
  willLoadQuips,
} from '../../../app/fuccSchedule.mjs';


// aligned to Date() local time
const NOW = moment(1234567890000);
const MOMENT_SHOW = moment('2001-01-01T01:00:00Z').add(NOW.utcOffset(), 'minutes');
const MOMENT_LIVE = moment('2002-02-02T02:00:00Z').add(NOW.utcOffset(), 'minutes');

const NO_DATA = Buffer.alloc(0);
const DEAD_DATA = 'DEAD';

const SHOW_DATA = `FILE\tANCHOR\tDAY_OF_WEEK\tHOUR_START\tHOUR_END
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

const LIVE_DATA = `FILE\tANCHOR\tYEAR\tMONTH\tDAY\tHOUR_START\tHOUR_END
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
  let next;
  let req;
  let res;

  beforeEach(() => {
    next = sandbox.spy();
    clock = sandbox.useFakeTimers({
      now: 0,
      toFake: [ 'Date' ], // nothing that touches Promises / the uv_loop
    });

    // mock Request & Response
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
  });
  afterEach(() => {
    theLib.forget();

    sandbox.restore();
    clock.restore();

    mockfs.restore();
  });


  describe('willLoadDead', () => {
    it('loads representative data', async () => {
      mockfs({ '/mock-fs': {
        'fucc': {
          'dead.txt': DEAD_DATA,
        }
      } });

      const dead = await willLoadDead();
      assert.equal(dead, 'DEAD');
    });
  });

  describe('willLoadLives', () => {
    it('loads representative data', async () => {
      mockfs({ '/mock-fs': {
        'fucc': {
          'live.txt': LIVE_DATA,
          'live.html': LIVE_HTML,
        }
      } });

      const lives = await willLoadLives();
      assert.deepEqual(lives, [
        {
          anchor: 'anchor',
          body: 'live1\nlive2\nlive3',
          day: 1,
          file: 'file',
          hourEnd: 11,
          hourStart: 10,
          month: 1,
          type: 'live',
          year: 2002
        },
      ]);
    });
  });

  describe('willLoadShows', () => {
    it('loads representative data', async () => {
      mockfs({ '/mock-fs': {
        'fucc': {
          'show.txt': SHOW_DATA,
          'show.html': SHOW_HTML,
        }
      } });

      const shows = await willLoadShows();
      assert.deepEqual(shows, [
        {
          anchor: 'anchor',
          body: 'show1\nshow2\nshow3',
          dayOfWeek: 0,
          file: 'file',
          hourEnd: 10,
          hourStart: 9,
          title: 'title',
          type: 'show'
        }
      ]);
    });
  });

  describe('willLoadQuips', () => {
    it('loads representative data', async () => {
      mockfs({ '/mock-fs': {
        'fucc': {
          'showquip.txt': QUIP_DATA,
        }
      } });

      const quips = await willLoadQuips();
      assert.deepEqual(quips, [
        [ 'text' ],
        [ 'text' ],
      ]);
    });
  });


  it('knows when the station is dead', async () => {
    mockfs({ '/mock-fs': {
      'fucc': {
        'dead.txt': DEAD_DATA,
        'showquip.txt': QUIP_DATA,
      }
    } });

    // it resolves the Response
    const returned = await middleware(req, res, next);
    assert.equal(returned, res);

    assert(! next.called);
    assert.equal(res._getData(), 'fuccSchedule.ejs');
    assert.equal(res.statusCode, 200);

    const context = res._getRenderData();
    assert.equal(context.dead, DEAD_DATA);
    assert(! context.current);
    assert.equal(context.quip.text, 'text');
  });

  it('knows when the station has a live event', async () => {
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

    await middleware(req, res, next);

    assert(! next.called);
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

  it('knows when the station has a show', async () => {
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

    await middleware(req, res, next);

    assert(! next.called);
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

  it('knows when it is being told nothing useful', async () => {
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

    await middleware(req, res, next);

    assert(! next.called);
    assert.equal(res._getData(), 'fuccSchedule.ejs');

    const context = res._getRenderData();
    assert(! context.dead);
    assert(! context.current);
    assert.equal(context.quip.text, 'text');
  });

  it('survives missing any given file', async () => {
    mockfs({ '/mock-fs': {
      'fucc': {
      }
    } });

    await middleware(req, res, next);

    assert(! next.called);
    assert.equal(res._getData(), 'fuccSchedule.ejs');

    const context = res._getRenderData();
    assert(! context.dead);
    assert(! context.current);
  });

  it('will fail gracefully', async () => {
    mockfs({ '/mock-fs': {
      'fucc': {
        'showquip.txt': QUIP_DATA,
        'show.txt': SHOW_DATA,
        'show.html': SHOW_HTML,
      }
    } });

    sandbox.stub(res, 'render').throws(new Error('BOOM'));
    sandbox.spy(res, 'send');

    // it resolves the Response
    const returned = await middleware(req, res, next);
    assert.equal(returned, res);

    assert(res.render.calledOnce);
    assert(! res.send.called);

    // Express gets informed
    assert(next.called);

    const err = next.args[0][0];
    assert.equal(err.message, 'BOOM');
  });
});
