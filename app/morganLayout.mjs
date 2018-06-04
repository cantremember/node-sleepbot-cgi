const Promise = require('bluebird');

const theLib = require('../lib/index');


// column -> index mapping
const cardColumns = theLib.columnToIndexMap('id abbrev title');

const quipColumns = theLib.columnToIndexMap('text');
const quips = [
    [ 'THE PURPLE BEAM, AND YOUR FOREHEAD' ],
    [ 'PEARLS WITHIN SWINE'                ],
    [ 'EFFORTLESS'                         ],
    [ 'DOOBIE DOOBIE DOO'                  ],
    [ 'LIGHT WITHOUT, LIGHT WITHIN'        ],
    [ '(The Kite Eating Tree)'             ],
    [ 'THE WALLS ARE NOT MELTING'          ],
].map((row) => {
    return theLib.dataColumnMap(row, quipColumns);
});

// load the cards file
const loadCards = theLib.willMemoize(() => {
    return theLib.wwwRoot.willLoadTSV('morgan/card.txt')
    .then((rows) => {
        return rows.map((row) => {
            const data = theLib.dataColumnMap(row, cardColumns);
            data.id = parseInt(data.id, 10);

            return data;
        });
    });
});


/**
 * Renders a random card layout from [Morgan's Tarot](http://sleepbot.com/morgan/cgi/morglay.cgi?cards=5)
 *
 * &nbsp;
 *
 * @see http://sleepbot.com/morgan/cgi/morglay.cgi
 * @function app.morganLayout
 * @params {express.request} req
 * @params {express.response} res
 * @params {Function} cb a callback invoked to continue down the Express middleware pipeline
 * @returns {Promise<express.response>} a Promise resolving `res`
 */
module.exports = function handler(req, res, cb) {
    const quip = theLib.chooseAny(quips);
    const cardIds = [];
    const cards = [];

    // parameters
    //   1..10 cards, assume 3
    let cardCount = req.query.cards;

    cardCount = ((cardCount === undefined || cardCount === null)
        ? 3
        : cardCount
    );
    cardCount = parseInt(cardCount, 10) || 0;
    cardCount = Math.min(Math.max(cardCount, 1), 10);

    return loadCards()
    .then((datas) => {
        // choose N unique cards
        while (cards.length < cardCount) {
            if (cards.length >= datas.length) {
                // we've chosen all of them
                break;
            }

            const card = theLib.chooseAny(datas);
            const id = card.id;
            if (cardIds.includes(id)) {
                // we've already chosen you
                continue;
            }

            // unique!
            cards.push(card);
            cardIds.push(id);
        }

        return Promise.promisify(res.render, {
            context: res,
        })('morganLayout.ejs', {
            config: theLib.config,
            cards,
            quip,
        })
        .then((body) => {
            res.send(body);
        });
    })
    .return(res)
    .catch(cb);
};
