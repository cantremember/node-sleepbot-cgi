/* eslint max-nested-callbacks: [ 1, 5 ] */

import assert from 'assert';
import sinon from 'sinon';
import mockfs from 'mock-fs';
import httpMocks from 'node-mocks-http';
import _ from 'lodash';

import theLib from '../../../lib/index.mjs';
import theHelper from '../../helper.mjs';


describe('lib/index', () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
    mockfs.restore();
    theHelper.mockConfig();

    theLib.forget();
  });


  describe('config', () => {
    it('overrides as expected', () => {
      assert(Array.isArray(theLib.config.get('sebServers')));

      assert.equal(theLib.config.get('wwwRoot'), '/mock-fs');
    });
  });


  describe('sebServerPrimary', () => {
    it('returns the primary SEB server', () => {
      const sebServers = theLib.config.get('sebServers');
      assert.equal(sebServers.length, 2);
      assert.equal(sebServers.every((server) => server.streamUrl), true);

      const { sebServerPrimary } = theLib;
      assert.notEqual(sebServerPrimary.serverUrl, undefined);
      assert.equal(sebServerPrimary.primary, true);
    });
  });


  describe('willMemoize', () => {
    let willPromise;
    let willHaveMemoized;
    beforeEach(() => {
      willPromise = sandbox.spy((value) => {
        return (new Promise((resolve) => setImmediate(resolve))).then(() => value);
      });
      willHaveMemoized = theLib.willMemoize(willPromise);
    });

    it('does not memoize when caching is disabled', () => {
      assert(! theLib.config.get('caching'));

      return willHaveMemoized(1)
      .then((value) => {
        assert.equal(value, 1);
        assert(willPromise.calledOnce);

        return willHaveMemoized(2);
      })
      .then((value) => {
        assert.equal(value, 2);
        assert(willPromise.calledTwice);
      });
    });

    it('memoizes when caching is enabled', () => {
      theHelper.mockConfig({ caching: true });

      return willHaveMemoized()
      .then((value) => {
        assert.strictEqual(value, undefined);
        assert(willPromise.calledOnce);

        return willHaveMemoized(1);
      })
      .then((value) => {
        // 1 is the first non-`undefined` value
        assert.equal(value, 1);
        assert(willPromise.calledTwice);

        return willHaveMemoized(2);
      })
      .then((value) => {
        // 2 is ignored because 1 was cached
        assert.equal(value, 1);
        assert(willPromise.calledTwice);
      });
    });
  });


  describe('forget', () => {
    let willHaveMemoized;
    beforeEach(() => {
      willHaveMemoized = theLib.willMemoize((value) => {
        return Promise.resolve(value);
      });
    });

    it('forgets what has been cached', () => {
      theHelper.mockConfig({ caching: true });

      return willHaveMemoized(1)
      .then((value) => {
        assert.strictEqual(value, 1);

        return willHaveMemoized(2);
      })
      .then((value) => {
        // already cached
        assert.strictEqual(value, 1);

        theLib.forget();

        return willHaveMemoized(2);
      })
      .then((value) => {
        // cache was flushed
        assert.strictEqual(value, 2);
      });
    });
  });


  describe('chooseAny', () => {
    it('ignores a non-Array', () => {
      assert.strictEqual(theLib.chooseAny(), undefined);
      assert.strictEqual(theLib.chooseAny('string'), undefined);
      assert.strictEqual(theLib.chooseAny({ object: true }), undefined);
    });

    it('chooses a value from an Array', () => {
      assert.strictEqual(theLib.chooseAny([]), undefined);
      assert.strictEqual(theLib.chooseAny([ 1 ]), 1);
      for (let i = 0; i < 10; ++i) {
        assert([ 1, 2 ].includes(theLib.chooseAny([ 1, 2 ])));
      }
    });
  });


  describe('columnToIndexMap', () => {
    it('maps a space-delimited String of columns to their indexes', () => {
      let map;

      map = theLib.columnToIndexMap();
      assert.equal(Object.keys(map).length, 0);

      map = theLib.columnToIndexMap('first,second third\tfourth|fifth');
      assert.deepEqual(map, {
        'first,second': 0,
        'third': 1,
        'fourth|fifth': 2,
      });
    });
  });


  describe('dataColumnMap', () => {
    const DATA = [ 'a', 'b', 'c' ];

    it('maps an Array of values using a column-to-index map', () => {
      let map;

      map = theLib.dataColumnMap(DATA);
      assert.equal(Object.keys(map).length, 0);

      map = theLib.dataColumnMap(DATA, { A: 0, B: 1 });
      assert.deepEqual(map, {
        A: 'a',
        B: 'b',
      });

      map = theLib.dataColumnMap(DATA, { A: 0, B: 1, C: 2, D: 3 });
      assert.deepEqual(map, {
        A: 'a',
        B: 'b',
        C: 'c',
        D: undefined,
      });
    });
  });


  describe('willRenderView', () => {
    const FILENAME = 'FILENAME';
    const CONTEXT = Object.freeze({});
    const RENDERED = 'RENDERED';

    it('will not mock what it cannot comprehend', async () => {
      const response = {
        render: sandbox.stub().callsArgWith(2, new Error('BOOM')),
      };

      try {
        await theLib.willRenderView(response, FILENAME, CONTEXT);
        theHelper.notCalled();
      }
      catch (err) {
        assert.ok((/not applying monkey-patch/).test(err.message));
      }
    });

    describe('with a representative express Response', () => {
      it('succeeds at a render', () => {
        const response = {
          render: sandbox.spy((filename, context, cb) => {
            assert.equal(filename, FILENAME);
            assert.equal(context, CONTEXT);
            assert.equal(_.isFunction(cb), true);

            cb(null, RENDERED);
          }),
        };

        return theLib.willRenderView(response, FILENAME, CONTEXT)
        .then((rendered) => {
          assert.equal(rendered, RENDERED);
          assert(response.render.calledOnce);
        });
      });

      it('fails to render', () => {
        const response = {
          // needs the minimum Function arity
          render: sandbox.spy((filename, context, cb) => {
            cb(new Error('BOOM'));
          }),
        };

        return theLib.willRenderView(response, FILENAME, CONTEXT)
        .then(assert.fail, (err) => {
          assert.equal(err.message, 'BOOM');
          assert(response.render.calledOnce);
        });
      });
    });

    describe('with a Response from `node-mocks-http`', () => {
      it('succeeds at a render', () => {
        const response = httpMocks.createResponse();
        sandbox.spy(response, 'render');

        return theLib.willRenderView(response, FILENAME, CONTEXT)
        .then((rendered) => {
          assert.equal(rendered, FILENAME);
          assert(response.render.calledOnce);
        });
      });
    });
  });
});
