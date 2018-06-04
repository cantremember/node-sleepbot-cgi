const theLib = require('../lib/index');


/**
 * Returns an [Express](https://npmjs.com/package/express) handler that
 * redirects to a root-relative path.
 *
 * @function app.redirectTo
 * @params {String} route a root-relative path
 * @returns {Function} an Express handler
 */
module.exports = function redirectTo(route) {
    return (req, res) => {
        res.redirect(theLib.baseURL(route));
    };
};
