const Promise = require('bluebird');

const theLib = require('../lib/index');

// column -> index mapping
const sampleColumns = theLib.columnToIndexMap('file ext page stub artist album track size');
const quipColumns = theLib.columnToIndexMap('text');

const FAKE_QUIP = Object.freeze({ text: '' });


// load the samples file
const loadSamples = theLib.willMemoize(() => {
    return theLib.wwwRoot.willLoadTSV('ambience/any.txt')
    .then((rows) => {
        return rows.map((row) => {
            return theLib.dataColumnMap(row, sampleColumns);
        });
    });
});

// load the quips file
const loadQuips = theLib.willMemoize(() => {
    return theLib.wwwRoot.willLoadTSV('ambience/anyquip.txt')
    .then((rows) => {
        return rows.map((row) => {
            return theLib.dataColumnMap(row, quipColumns);
        });
    });
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
 * @params {Function} cb a callback invoked to continue down the Express middleware pipeline
 * @returns {Promise<express.response>} a Promise resolving `res`
 */
function handler(req, res, cb) {
    let quip;
    let sample;

    return Promise.all([
        // (1) the sample
        loadSamples()
        .then((datas) => {
            // choose a random sample
            sample = theLib.chooseAny(datas);
            if (sample === undefined) {
                return undefined;
            }

            // we split sample storage into two subdirectories
            sample.dirNum = (/^[m-z]/.test(sample.file) ? 2 : 1);

            // things about the album
            const stub = sample.stub;
            let album = handler.cache[stub];

            if (album) {
                // already cached
                sample = Object.assign({}, album, sample);
                return undefined;
            }

            // populate the cache
            const albumFile = stub.toLowerCase();
            const coverImage = [ '/ambience/covergif/', albumFile, '.gif'].join('');
            album = {
                albumFile,
                albumAnchor: stub.toUpperCase(),
                // has a cover image?
                coverImage,
                coverExists: false,
            };

            if (theLib.config.get('caching')) {
                // cache
                handler.cache[stub] = album;
            }

            return theLib.wwwRoot.willDetectFile(coverImage)
            .then((exists) => {
                album.coverExists = exists;

                sample = Object.assign({}, album, sample);
            });
        }),

        // (2) the quip
        loadQuips()
        .then((datas) => {
            // choose a random quip
            quip = theLib.chooseAny(datas);
        })
    ])
    .then(() => {
        if (sample === undefined) {
            // we cannot provide a response
            //   nor are we releasing Zalgo
            return cb && cb(null);
        }

        if (quip === undefined) {
            quip = FAKE_QUIP;
        }

        return Promise.promisify(res.render, {
            context: res,
        })('ambienceAnySample.ejs', {
            config: theLib.config,
            sample,
            quip,
        })
        .then((body) => {
            res.send(body);
        });
    })
    .return(res)
    .catch(cb);
}

/**
 * Flushes the cache
 *
 * @memberof app.ambienceAnySample
 * @function forget
 */
handler.forget = function forget() {
    this.cache = {};
};
handler.forget();


module.exports = handler;
