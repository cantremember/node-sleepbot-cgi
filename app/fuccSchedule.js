'use strict';

// jshint -W079
const Promise = require('bluebird');
// jshint +W079
const theLib = require('../lib/index');

// // TODO: timezone support
// const timeZoneOffset = 0;

// column -> index mapping
const liveColumns = theLib.columnToIndexMap('file anchor year month day hourStart hourEnd');
const showColumns = theLib.columnToIndexMap('file anchor dayOfWeek hourStart hourEnd');
const quipColumns = theLib.columnToIndexMap('text');
const dayOfWeekNames = 'Sunday Monday Tuesday Wednesday Thursday Friday Saturday'.split(/\s/); // 0-based
const dayOfWeekAnchors = 'SUN MON TUE WED THU FRI SAT'.split(/\s/); // 0-based

const NO_QUIPS = Object.freeze([ [] ]);
const FAKE_QUIP = Object.freeze({ text: '' });


function coerceData(data) {
    // FIXME:  TypeError: Property '@@iterator' of object"
    //   for (let key of Object.keys(data)) {
    const keys = Object.keys(data);
    for (let i = 0, key; i < keys.length; ++i) {
        key = keys[i];

        switch (key) {
            case 'file':
            case 'anchor':
                break;
            default: // numeric properties
                data[key] = parseInt(data[key], 10);
        }
    }
    return data;
}

function scrapeBodyTitle(data, lines, start, titleStart /* optional */, end) {
    if (end === undefined) {
        [ end, titleStart ] = [ titleStart, undefined ];
    }

    const body = [];
    let phase = 0;

    // FIXME:  TypeError: Property '@@iterator' of object"
    //   for (let line of lines) {
    for (let i = 0, line; i < lines.length; ++i) {
        line = lines[i];

        switch (phase) {
            case 0: // searching
                if (start.test(line)) {
                    // the next line starts it
                    phase += 1;
                }
                break;
            case 1: // scraping the body
                if (titleStart && titleStart.test(line)) {
                    // the next line starts it
                    phase += 1;
                }
                else if (end.test(line)) {
                    // that's the end of it
                    phase = 4;
                }
                else {
                    body.push(line);
                }
                break;
            case 2: // scraping the single-line title
                data.title = line;

                // and the rest is body
                phase += 1;
                break;
            case 3: // scraping the rest of the body
                if (end.test(line)) {
                    // that's the end of it
                    phase += 1;
                }
                else {
                    body.push(line);
                }
                break;
        }
    }

    // stringify
    data.body = body.join('\n');
    return data;
}


/*
   the dead file
*/
const loadDead = theLib.willMemoize(() => {
    return theLib.wwwRoot.willLoadFile('fucc/dead.txt')
    .catch(/* istanbul ignore next */ () => {
        // not present
        return undefined;
    });
});


/*
   the live file
*/
function isLiveNow(data, date) {
    // exact date match
    if ((data.year !== date.getFullYear()) || (data.month !== date.getMonth()) || (data.day !== date.getDate())) {
        return false;
    }
    // and within the hour range
    const hour = date.getHours();
    return (hour >= data.hourStart) && (hour < data.hourEnd);
}
const loadLives = theLib.willMemoize(() => {
    let datas;

    return theLib.wwwRoot.willLoadTSV('fucc/live.txt')
    .then((rows) => {
        // coerce
        datas = rows.map((row) => {
            const data = coerceData(theLib.dataColumnMap(row, liveColumns));
            data.type = 'live';

            // 2-digit year
            const yy = parseInt(data.year, 10);
            data.year = yy + (yy < 500 ? 1900 : /* istanbul ignore next */ 0);

            return data;
        });

        // the live schedule, for scrape-age
        return theLib.wwwRoot.willLoadFile('fucc/live.html');
    })
    .then((page) => {
        const lines = (page || '').split('\n');

        return datas.map((data) => {
            return scrapeBodyTitle(data, lines,
                new RegExp('^<A NAME="' + data.anchor + '">'),
                /^<A NAME=/
            );
        });
    });
});
function checkLive(date) {
    // load up the rows
    return loadLives()
    .then((datas) => {
        // the first one that's live
        return datas && datas.filter((data) => {
            return isLiveNow(data, date);
        })[0];
    })
    .catch(() => {
        // treat as no match
        return undefined;
    });
}

/*
   the show file
*/
function isShowNow(data, date) {
    // same day of the week (0-based)
    if (data.dayOfWeek !== date.getDay()) {
        return false;
    }
    // and within the hour range
    const hour = date.getHours();
    return (hour >= data.hourStart) && (hour < data.hourEnd);
}
const loadShows = theLib.willMemoize(() => {
    let datas;

    return theLib.wwwRoot.willLoadTSV('fucc/show.txt')
    .then((rows) => {
        // coerce
        datas = rows.map((row) => {
            const data = coerceData(theLib.dataColumnMap(row, showColumns));
            data.type = 'show';

            return data;
        });

        // the show schedule, for scrape-age
        return theLib.wwwRoot.willLoadFile('fucc/show.html');
    })
    .then((page) => {
        const lines = (page || '').split('\n');

        return datas.map((data) => {
            return scrapeBodyTitle(data, lines,
                new RegExp('^<A NAME="' + data.anchor + '">'),
                /^<!-- start -->/,
                /^<!-- end -->/
            );
        });
    });
});
function checkShow(date) {
    // load up the rows
    return loadShows()
    .then((datas) => {
        // the first one that's live
        return datas && datas.filter((data) => {
            return isShowNow(data, date);
        })[0];
    })
    .catch(() => {
        // treat as no match
        return undefined;
    });
}


/*
   the quip file
*/
const loadQuips = theLib.willMemoize(() => {
    return theLib.wwwRoot.willLoadTSV('fucc/showquip.txt')
    .catch(() => {
        return NO_QUIPS;
    });
});


/**
 * Renders on-air status for [F.U.C.C Radio](http://sleepbot.com/fucc/cgi/schednow.cgi)
 *
 * &nbsp;
 *
 * @see http://sleepbot.com/fucc/cgi/schednow.cgi
 * @function app.fuccSchedule
 * @params {express.request} req
 * @params {express.response} res
 * @params {Function} cb a callback invoked to continue down the Express middleware pipeline
 * @returns {Promise<express.response>} a Promise resolving `res`
 */
module.exports = function handler(req, res, cb) {
    const date = new Date(), day = date.getDay();
    let dead, current;
    let quip;

    return loadDead()
    .then((_dead) => {
        dead = _dead;
        if (dead || current) {
            // we're done
            return;
        }

        return checkLive(date);
    })
    .then((_live) => {
        current = current || _live;
        if (dead || current) {
            // we're done
            return;
        }

        return checkShow(date);
    })
    .then((_show) => {
        current = current || _show;

        return loadQuips();
    })
    .then((rows) => {
        // choose a random quip
        quip = theLib.dataColumnMap(theLib.chooseAny(rows), quipColumns) || /* istanbul ignore next */ FAKE_QUIP;

        return Promise.promisify(res.render, res)('fuccSchedule.ejs', {
            config: theLib.config,
            dead,
            current,
            quip,
            date,
            dayOfWeekName: dayOfWeekNames[day],
            dayOfWeekAnchor: dayOfWeekAnchors[day],
        })
        .then((body) => {
            res.send(body);
        });
    })
    .return(res)
    .catch(theLib.callbackAndThrowError(cb));
};
