'use strict';

var Promise = require('bluebird');

var theLib = require('../lib/index');


// column -> index mapping
var cardColumns = theLib.columnToIndexMap('id abbrev title');

var quipColumns = theLib.columnToIndexMap('text');
var quips = [
    [ 'THE PURPLE BEAM, AND YOUR FOREHEAD' ],
    [ 'PEARLS WITHIN SWINE'                ],
    [ 'EFFORTLESS'                         ],
    [ 'DOOBIE DOOBIE DOO'                  ],
    [ 'LIGHT WITHOUT, LIGHT WITHIN'        ],
    [ '(The Kite Eating Tree)'             ],
    [ 'THE WALLS ARE NOT MELTING'          ],
].map(function(row) {
    return theLib.dataColumnMap(row, quipColumns);
});

var NO_CARDS = Object.freeze([]);

// load the cards file
var loadCards = theLib.willMemoize(function() {
    return theLib.wwwRoot.willLoadTSV('morgan/card.txt')
    .then(function(rows) {
        return rows.map(function(row) {
            var data = theLib.dataColumnMap(row, cardColumns);
            data.id = parseInt(data.id, 10);

            return data;
        });
    })
    .catch(function() {
        // treat as no match
        return NO_CARDS;
    });
});


module.exports = function handler(req, res, cb) {
    var quip = theLib.chooseAny(quips);
    var cardIds = [];
    var cards = [];

    // parameters
    //   1..10 cards, assume 3
    var cardCount = req.param('cards');
    cardCount = (cardCount === undefined ? 3 : cardCount);
    cardCount = parseInt(cardCount, 10) || 0;
    cardCount = Math.min(Math.max(cardCount, 1), 10);

    return loadCards()
    .then(function(datas) {
        // choose N unique cards
        while (cards.length < cardCount) {
            if (cards.length >= datas.length) {
                // we've chosen all of them
                break;
            }

            var card = theLib.chooseAny(datas);
            var id = card.id;
            if (cardIds.indexOf(id) !== -1) {
                // we've already chosen you
                continue;
            }

            // unique!
            cards.push(card);
            cardIds.push(id);
        }

        return Promise.promisify(res.render, res)('morganLayout.ejs', {
            config: theLib.config,
            cards: cards,
            quip: quip,
        })
        .then(function(body) {
            res.send(body);
        });
    })
    .catch(theLib.callbackAndThrowError(cb));
};
