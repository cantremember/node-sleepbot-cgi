const path = require('path');

const theLib = require('../lib/index');


/**
 * Returns an [Express](https://npmjs.com/package/express) handler that
 * redirects to a random file resource.
 *
 * @function app.redirectToRandomFile
 * @params {String} filepath a physical directory *and* root-relative path
 * @params {String} glob a glob pattern
 * @returns {Function} an Express handler
 */
module.exports = function(filepath, glob = '*.*') {
    // a Promise
    const globpath = path.join(filepath, glob);
    const willGetFilenames = theLib.willMemoize(() => {
        return theLib.wwwRoot.willGetFilenames(globpath);
    });

    return (req, res, cb) => {
        return willGetFilenames()
        .then((filenames) => {
            const choice = theLib.chooseAny(filenames);
            if (choice === undefined) {
                throw new Error('no glob results: ' + globpath);
            }

            res.redirect(theLib.baseURL(
                path.join(filepath, theLib.chooseAny(filenames))
            ));
        })
        .return(res)
        .catch(theLib.callbackAndThrowError(cb));
    };
};
