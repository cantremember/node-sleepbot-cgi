/*
  TODO:  support a traditional 'main' CJS module
    (1) no one uses this as a stand-alone library
    (2) there's no transpilation; our runtime is 100% dependent upon `esm` / ESModules
*/

import theLib from './lib/index';
export default theLib;
