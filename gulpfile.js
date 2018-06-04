/* istanbul ignore file */

// ECMAScript modules bootstrapping
//   so that we can use the standard Gulp filename
//   and not worry about `-r esm` when invoking Tasks
const { esm } = require('./package.json');

require('esm')(module, esm)(
  // non-standard location for "the details"
  './bin/gulp'
);
