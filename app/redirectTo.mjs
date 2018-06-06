import theLib from '../lib/index';


/**
 * Returns an [Express](https://npmjs.com/package/express) middleware Function
 * which redirects to a root-relative path.
 *
 * @function app.redirectTo
 * @params {String} route a root-relative path
 * @returns {Function<Promise>} an async Express middeware Function
 */
export default function redirectTo(route) {
  return (req, res) => {
    res.redirect(theLib.baseURL(route));
  };
}
