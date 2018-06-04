import wwwRoot from '../lib/wwwRoot';
import theLib from '../lib/index';


// the filenames
const willGetFilenames = theLib.willMemoize(() => {
  return wwwRoot.willGetFilenames('lookit/story/*.txt');
});

// the files themselves
const willGetFile = (filepath) => {
  const cache = handler.cache; // eslint-disable-line no-use-before-define
  const will = cache[filepath] || theLib.willMemoize(() => {
    return wwwRoot.willLoadFile(filepath);
  });
  if (theLib.config.get('caching')) {
    // cache
    cache[filepath] = will;
  }
  // execute to produce a Promise
  return will();
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
 * @params {Function} cb a callback invoked to continue down the Express middleware pipeline
 * @returns {Promise<express.response>} a Promise resolving `res`
 */
function handler(req, res, cb) {
  return willGetFilenames()
  .then((filenames) => {
    const filepath = theLib.chooseAny(filenames);

    return willGetFile('lookit/story/' + filepath);
  })
  .then((body) => {
    return theLib.willRenderView(res, 'lookitAnyStory.ejs', {
      config: theLib.config,
      body,
    });
  })
  .then((body) => {
    res.send(body);
  })
  .return(res)
  .catch(cb);
}

/**
 * Flushes the cache
 *
 * @memberof app.lookitAnyStory
 * @function forget
 */
handler.forget = function forget() {
  this.cache = {};
};
handler.forget();


export default handler;
