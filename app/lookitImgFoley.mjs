import theLib from '../lib/index.mjs';


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
 * @params {Function} next a callback invoked to continue down the Express middleware pipeline
 * @returns {Promise<express.response>} a Promise resolving `res`
 */
export default async function middleware(req, res, next) {
  try {
    let { title, image } = req.query;
    title = title || '(image)';
    image = (image
      ? ('/lookit/images/dfoley/' + image)
      : '/images/shim_clear.gif'
    );

    const body = await theLib.willRenderView(res, 'lookitImgFoley.ejs', {
      config: theLib.config,
      title,
      image,
    });
    res.status(200).send(body);

    return res;
  }
  catch (err) {
    next(err);
    return res;
  }
}
