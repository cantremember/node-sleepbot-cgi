import Promise from 'bluebird';

import wwwRoot from '../lib/wwwRoot';
import theLib from '../lib/index';


// column -> index mapping
const SAMPLE_COLUMNS = theLib.columnToIndexMap('file ext page stub artist album track size');
const QUIP_COLUMNS = theLib.columnToIndexMap('text');

const FAKE_QUIP = Object.freeze({ text: '' });


// load the samples file
const willLoadSamples = theLib.willMemoize(async () => {
  const rows = await wwwRoot.willLoadTSV('ambience/any.txt');
  return rows.map((row) => theLib.dataColumnMap(row, SAMPLE_COLUMNS));
});

// load the quips file
const willLoadQuips = theLib.willMemoize(async () => {
  const rows = await wwwRoot.willLoadTSV('ambience/anyquip.txt');
  return rows.map((row) => theLib.dataColumnMap(row, QUIP_COLUMNS));
});


/**
 * Generates a random page from [Ambience for the Masses](http://sleepbot.com/ambience/cgi/any_f.cgi)
 *
 * &nbsp;
 *
 * @see http://sleepbot.com/ambience/cgi/any_f.cgi
 * @function app.ambienceAnySample
 * @params {express.request} req
 * @params {express.response} res
 * @params {Function} next a callback invoked to continue down the Express middleware pipeline
 * @returns {Promise<express.response>} a Promise resolving `res`
 */
async function middleware(req, res, next) {
  try {
    const [ samples, quips ] = await Promise.all([
      willLoadSamples(),
      willLoadQuips(),
    ]);
    const quip = theLib.chooseAny(quips) || FAKE_QUIP;

    // choose a random sample
    const sample = theLib.chooseAny(samples);
    if (sample === undefined) {
      // we cannot provide a response
      //   nor are we releasing Zalgo
      next();
      return await res;
    }

    // mutate the cached sample Object;
    //   the results are consistent

    // we split sample storage into two subdirectories
    sample.dirNum = (/^[m-z]/.test(sample.file) ? 2 : 1);

    // things about the album
    const stub = sample.stub;
    let album = middleware.cache[stub];

    if (! album) {
      // populate the cache
      const albumFile = stub.toLowerCase();
      const coverImage = `/ambience/covergif/${ albumFile }.gif`;
      const coverExists = await wwwRoot.willDetectFile(coverImage);

      album = {
        albumFile,
        albumAnchor: stub.toUpperCase(),
        coverImage,
        coverExists,
      };

      if (theLib.config.get('caching')) {
        // cache
        middleware.cache[stub] = album;
      }
    }
    Object.assign(sample, album);

    const body = await theLib.willRenderView(res, 'ambienceAnySample.ejs', {
      config: theLib.config,
      sample,
      quip,
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
 * @memberof app.ambienceAnySample
 * @function forget
 */
middleware.forget = function forget() {
  this.cache = {};
};
middleware.forget();


export default middleware;
