import wwwRoot from '../lib/wwwRoot.mjs';
import theLib from '../lib/index.mjs';


// column -> index mapping
const CARD_COLUMNS = theLib.columnToIndexMap('id abbrev title');

const QUIP_COLUMNS = theLib.columnToIndexMap('text');
const QUIPS = [
  [ 'THE PURPLE BEAM, AND YOUR FOREHEAD' ],
  [ 'PEARLS WITHIN SWINE'                ],
  [ 'EFFORTLESS'                         ],
  [ 'DOOBIE DOOBIE DOO'                  ],
  [ 'LIGHT WITHOUT, LIGHT WITHIN'        ],
  [ '(The Kite Eating Tree)'             ],
  [ 'THE WALLS ARE NOT MELTING'          ],
].map((row) => {
  return theLib.dataColumnMap(row, QUIP_COLUMNS);
});

// load the cards file
export const willLoadCards = theLib.willMemoize(async () => {
  const rows = await wwwRoot.willLoadTSV('morgan/card.txt', {
    columns: false, // its first line is a count of rows
    relax_column_count_more: true,
  });

  return rows.map((row) => {
    const data = theLib.dataColumnMap(row, CARD_COLUMNS);
    data.id = parseInt(data.id, 10);

    return data;
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
 * @params {Function} next a callback invoked to continue down the Express middleware pipeline
 * @returns {Promise<express.response>} a Promise resolving `res`
 */
export default async function middleware(req, res, next) {
  const quip = theLib.chooseAny(QUIPS);
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

  try {
    // choose N unique cards
    const datas = await willLoadCards();
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

    const body = await theLib.willRenderView(res, 'morganLayout.ejs', {
      config: theLib.config,
      cards,
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
