import path from 'path';

import wwwRoot from '../lib/wwwRoot';
import theLib from '../lib/index';


/**
 * Returns an [Express](https://npmjs.com/package/express) middeware that
 * redirects to a random file resource.
 *
 * @function app.redirectToRandomFile
 * @params {String} filepath a physical directory *and* root-relative path
 * @params {String} glob a glob pattern
 * @returns {Function<Promise>} an async Express middeware Function
 */
export default function redirectToRandomFile(filepath, /* istanbul ignore next */ glob = '*.*') {
  // a Promise
  const globpath = path.join(filepath, glob);
  const willGetFilenames = theLib.willMemoize(async () => {
    const file = await wwwRoot.willGetFilenames(globpath);
    return file;
  });

  return async (req, res, next) => {
    try {
      const filenames = await willGetFilenames();
      const choice = theLib.chooseAny(filenames);
      if (choice === undefined) {
        throw new Error('no glob results: ' + globpath);
      }

      res.redirect(theLib.baseURL(
        path.join(filepath, theLib.chooseAny(filenames))
      ));

      return res;
    }
    catch (err) {
      next(err);
      return res;
    }
  };
}
