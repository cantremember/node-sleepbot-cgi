import _ from 'lodash';

import theConfig from './config.mjs';

const EMPTY_OBJECT = Object.freeze({});
const forgetMemoize = [];

/**
 * #### A Library of Functions and Singletons
 *
 * &nbsp;
 *
 * @namespace lib
 */
export default {
  /**
   * @memberof lib
   * @see config
   */
  config: theConfig,

  /**
   * @memberof lib
   * @returns {String} the primary SEB server
   */
  get sebServerPrimary() {
    const servers = this.config.get('sebServers');

    return servers.reduce((prior, current) => {
      return current.primary ? /* istanbul ignore next */ current : prior;
    });
  },


  /**
   * @memberof lib
   * @param {Function} will a Function executing a Promise whose result will be memoized
   * @returns {Function} a Function returning a Promise which memomizes the result of `will`
   */
  willMemoize(will) {
    const { config } = this;

    // captured in scope
    let result;
    forgetMemoize.push(() => {
      result = undefined;
    });

    // leave as a Function;
    //   the scope of `this` & `arguments` are bound to where
    //   the `() => { }` is defined, vs. decoupled, as we need it to be
    return async function(...args) {
      if (result !== undefined) {
        return Promise.resolve(result);
      }

      const self = this; // eslint-disable-line no-invalid-this
      const _result = await Promise.resolve(
        // from within an established Promise
        will.apply(self, args)
      );

      if (config.get('caching')) {
        // cache
        result = _result;
      }
      return _result;
    };
  },

  /**
   * Forgets any results cached by {@link lib.willMemoize}
   *
   * @memberof lib
   */
  forget() {
    // FIXME:  TypeError: Property '@@iterator' of object"
    //   for (let f of forgetMemoize) {
    for (let i = 0; i < forgetMemoize.length; ++i) {
      forgetMemoize[i]();
    }
  },

  /**
   * @memberof lib
   * @param {Array<Object>} array an Array
   * @returns {Object} a random value from `array`
   */
  chooseAny(array) {
    if (! Array.isArray(array)) {
      return undefined;
    }
    const choice = Math.floor(Math.random() * array.length);
    return array[choice];
  },

  /**
   * @memberof lib
   * @param {String} route a root-relative path
   * @returns {String} an absolute URL relative to `baseURL` from {@link config}
   */
  baseURL(/* istanbul ignore next */ route = '') {
    return this.config.get('baseURL') + route;
  },


  /**
   * @example
   * assert.deepEqual(
   *     lib.columnToIndexMap('zero one two'),
   *     { zero: 0, one: 1, two: 2 }
   * )
   *
   * @memberof lib
   * @param {String} spaceDelimited a space-delimited String of column names
   * @returns {Object<Integer>} a property Object mapping each column name to its column index
   */
  columnToIndexMap(spaceDelimited) {
    return (spaceDelimited || '').split(/\s/).reduce((total, column, index) => {
      if (column !== '') {
        total[column] = index;
      }
      return total;
    }, {});
  },

  /**
   * @example
   * assert.deepEqual(
   *     lib.dataColumnMap([ 'cero', 'uno', 'dos' ], { zero: 0, one: 1, two: 2 }),
   *     { zero: 'cero', one: 'uno', two: 'dos' }
   * )
   *
   * @memberof lib
   * @param {Array<Object>} maybeRow an Array of values
   * @param {Object<Integer>} columnToIndex the results of {@link lib.columnToIndexMap}
   * @returns {Object<Object>} a property Object mapping each column name to its `row` value
   */
  dataColumnMap(maybeRow, columnToIndex) {
    const row = maybeRow || EMPTY_OBJECT;
    return Object.keys(columnToIndex || EMPTY_OBJECT).reduce((map, key) => {
      map[key] = row[columnToIndex[key]];
      return map;
    }, {});
  },


  /**
   * @memberof lib
   * @param {express.Response} res
   * @param {String} filename the template filename, relative to `viewsRoot` from {@link config}
   * @param {Object} context a render context Object
   * @returns {Promise<String>} a Promise resolving the results of `ejs` rendering
   */
  async willRenderView(res, filename, context) { // eslint-disable-line require-await
    // well, *this* is just dandy
    //   #render from `node-http-mock#createResponse` doesn't support a callback
    //   and the Object returned doesn't have a Prototype, so it can't be monkey-patched
    //   we must DETECT THIS CONDITION the hard way
    if (res.render.length > 2) {
      // a basic Promise wrapper around express.Response#render
      return new Promise((resolve, reject) => {
        res.render(filename, context, (err, rendered) => {
          if (err) {
            reject(err);
          }
          else {
            resolve(rendered);
          }
        });
      });
    }

    // this has better be the results of a `createResponse`
    if (! _.isFunction(res._getData)) {
      throw new Error('not applying monkey-patch to Response#render in `node-mocks-http`');
    }

    // there is no actual "rendering" going on, and the context may be omitted entirely
    //   so we'll just echo back the filename
    return new Promise((resolve, reject) => {
      try {
        res.render(filename, context);
        resolve(res._getRenderView());
      }
      catch (err) {
        reject(err);
      }
    });
  },
};
