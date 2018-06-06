import wwwRoot from '../lib/wwwRoot';
import theLib from '../lib/index';


// the filenames
const willGetFilenames = theLib.willMemoize(async () => {
  const file = await wwwRoot.willGetFilenames('lookit/story/*.txt');
  return file;
});

// the files themselves
const willGetFile = async (filepath) => {
  const cache = middleware.cache; // eslint-disable-line no-use-before-define
  const will = cache[filepath] || theLib.willMemoize(async () => {
    const file = await wwwRoot.willLoadFile(filepath);
    return file;
  });

  if (theLib.config.get('caching')) {
    // cache
    cache[filepath] = will;
  }

  // execute to produce a Promise
  const file = await will();
  return file;
};


/**
 * Renders a random story from [The Root of All Things Lookit](http://sleepbot.com/lookit/cgi/anystory.cgi)
 *
 * &nbsp;
 *
 * @see http://sleepbot.com/lookit/cgi/anystory.cgi
 * @function app.lookitAnyStory
 * @params {express.request} req
 * @params {express.response} res
 * @params {Function} next a callback invoked to continue down the Express middleware pipeline
 * @returns {Promise<express.response>} a Promise resolving `res`
 */
async function middleware(req, res, next) {
  try {
    const filenames = await willGetFilenames();
    const filepath = theLib.chooseAny(filenames);
    const file = await willGetFile('lookit/story/' + filepath);

    const body = await theLib.willRenderView(res, 'lookitAnyStory.ejs', {
      config: theLib.config,
      body: file,
    });
    res.status(200).send(body);

    return res;
  }
  catch (err) {
    next(err);
    return res;
  }
}

/**
 * Flushes the cache
 *
 * @memberof app.lookitAnyStory
 * @function forget
 */
middleware.forget = function forget() {
  this.cache = {};
};
middleware.forget();


export default middleware;
