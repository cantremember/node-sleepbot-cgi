const Promise = require('bluebird');

const theLib = require('../lib/index');


/**
 * Renders an `<img />` wrapper page for [The Root of All Things Lookit](
 *   http://sleepbot.com/lookit/cgi/imgfoley.cgi?title=Jonesie,+the+Groovepuss&image=jonesie.jpg
 * )
 *
 * &nbsp;
 *
 * @see http://sleepbot.com/lookit/cgi/imgfoley.cgi?title=Example
 * @function app.lookitImgFoley
 * @params {express.request} req
 * @params {express.response} res
 * @params {Function} cb a callback invoked to continue down the Express middleware pipeline
 * @returns {Promise<express.response>} a Promise resolving `res`
 */
module.exports = function handler(req, res, cb) {
    return Promise.resolve()
    .then(() => {
        let { title, image } = req.query;

        title = title || '(image)';
        image = (image
            ? ('/lookit/images/dfoley/' + image)
            : '/images/shim_clear.gif'
        );

        return Promise.promisify(res.render, {
            context: res,
        })('lookitImgFoley.ejs', {
            config: theLib.config,
            title,
            image,
        })
        .then((body) => {
            res.send(body);
        });
    })
    .return(res)
    .catch(cb);
};
