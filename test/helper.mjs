import assert from 'assert';
import fs from 'fs';
import path from 'path';
import glob from 'glob';
import mitm from 'mitm';

import theConfig from '../lib/config';
const theConfigDefaults = theConfig.stores[theConfig.FILE_DEFAULT];
assert.ok(theConfigDefaults, '`nconf` has changed how it stores things');

const REAL_VIEWS_ROOT = theConfigDefaults.get('viewsRoot');

// a singleton MITM instance
//  must be created before anyone imports `net`; @see bootstrap
//  `theHelper.mitm.enable();`
//  `theHelper.mitm.disable();`
const mitmSingleton = mitm();
mitmSingleton.disable();


export default {
  mitm: mitmSingleton,

  // returns a Function that throws
  throws(e = new Error('threw')) {
    return () => { throw e; };
  },

  // returns a Function that asserts it shouldn't be called
  notCalled() {
    assert(false, 'should not be called');
  },

  realEjs(filename) {
    return fs.readFileSync(path.join(REAL_VIEWS_ROOT, filename), { encoding: 'utf8' }); // eslint-disable-line no-sync
  },

  // inject =  `mockConfig({ mocked: true })`
  // restore = `mockConfig()`
  mockConfig(store, config = theConfig) {
    config.stores.mock.store = (store || {});
  },

  mockGlob(sandbox, fResults) {
    // leave as a Function;
    //   the scope of `this` are bound to where
    //   the `() => { }` is defined, vs. the prototype to which it's attached
    return sandbox.stub(glob.Glob.prototype, '_process').callsFake(function(...args) {
      this.emit('end', fResults.call(this, args)); // eslint-disable-line no-invalid-this
    });
  },
};
