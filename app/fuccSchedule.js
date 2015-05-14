'use strict';

var Promise = require('bluebird');
var theLib = require('../lib/index');

// // TODO: timezone support
// var timeZoneOffset = 0;

// column -> index mapping
var liveColumns = theLib.columnToIndexMap('file anchor year month day hourStart hourEnd');
var showColumns = theLib.columnToIndexMap('file anchor dayOfWeek hourStart hourEnd');
var quipColumns = theLib.columnToIndexMap('text');
var dayOfWeekNames = 'Sunday Monday Tuesday Wednesday Thursday Friday Saturday'.split(/\s/); // 0-based
var dayOfWeekAnchors = 'SUN MON TUE WED THU FRI SAT'.split(/\s/); // 0-based

var NO_QUIPS = Object.freeze([ [] ]);
var FAKE_QUIP = Object.freeze({ text: '' });


function coerceData(data) {
    Object.keys(data).forEach(function(key) {
        switch (key) {
            case 'file':
            case 'anchor':
                break;
            default: // numeric properties
                data[key] = parseInt(data[key], 10);
        }
    });
    return data;
}

function scrapeBodyTitle(data, lines, start, titleStart /* optional */, end) {
    if (end === undefined) {
        end = titleStart;
        titleStart = undefined;
    }

    var phase = 0;
    var body = [];

    lines.forEach(function(line) {
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
    });

    // stringify
    data.body = body.join('\n');
    return data;
}


/*
   the dead file
*/
var loadDead = theLib.willMemoize(function loadDead() {
    return theLib.wwwRoot.willLoadFile('fucc/dead.txt')
    .catch(/* istanbul ignore next */ function() {
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
    var hour = date.getHours();
    return (hour >= data.hourStart) && (hour < data.hourEnd);
}
var loadLives = theLib.willMemoize(function loadLives() {
    var datas;

    return theLib.wwwRoot.willLoadTSV('fucc/live.txt')
    .then(function(rows) {
        // coerce
        datas = rows.map(function(row) {
            var data = theLib.dataColumnMap(row, liveColumns);
            data = coerceData(data);
            data.type = 'live';

            // 2-digit year
            var yy = parseInt(data.year, 10);
            data.year = yy + (yy < 500 ? 1900 : /* istanbul ignore next */ 0);

            return data;
        });

        // the live schedule, for scrape-age
        return theLib.wwwRoot.willLoadFile('fucc/live.html');
    })
    .then(function(page) {
        var lines = (page || '').split('\n');

        return datas.map(function(data) {
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
    .then(function(datas) {
        // the first one that's live
        return datas && datas.filter(function(data) {
            return isLiveNow(data, date);
        })[0];
    })
    .catch(function() {
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
    var hour = date.getHours();
    return (hour >= data.hourStart) && (hour < data.hourEnd);
}
var loadShows = theLib.willMemoize(function loadShows() {
    var datas;

    return theLib.wwwRoot.willLoadTSV('fucc/show.txt')
    .then(function(rows) {
        // coerce
        datas = rows.map(function(row) {
            var data = theLib.dataColumnMap(row, showColumns);
            data = coerceData(data);
            data.type = 'show';

            return data;
        });

        // the show schedule, for scrape-age
        return theLib.wwwRoot.willLoadFile('fucc/show.html');
    })
    .then(function(page) {
        var lines = (page || '').split('\n');

        return datas.map(function(data) {
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
    .then(function(datas) {
        // the first one that's live
        return datas && datas.filter(function(data) {
            return isShowNow(data, date);
        })[0];
    })
    .catch(function() {
        // treat as no match
        return undefined;
    });
}


/*
   the quip file
*/
var loadQuips = theLib.willMemoize(function loadQuips() {
    return theLib.wwwRoot.willLoadTSV('fucc/showquip.txt')
    .catch(function() {
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
    var dead, current;
    var quip;
    var date = new Date(), day = date.getDay();

    return loadDead()
    .then(function(_dead) {
        dead = _dead;
        if (dead || current) {
            // we're done
            return;
        }

        return checkLive(date);
    })
    .then(function(_live) {
        current = current || _live;
        if (dead || current) {
            // we're done
            return;
        }

        return checkShow(date);
    })
    .then(function(_show) {
        current = current || _show;

        return loadQuips();
    })
    .then(function(rows) {
        // choose a random quip
        quip = theLib.dataColumnMap(theLib.chooseAny(rows), quipColumns) || /* istanbul ignore next */ FAKE_QUIP;

        return Promise.promisify(res.render, res)('fuccSchedule.ejs', {
            config: theLib.config,
            dead: dead,
            current: current,
            quip: quip,
            date: date,
            dayOfWeekName: dayOfWeekNames[day],
            dayOfWeekAnchor: dayOfWeekAnchors[day],
        })
        .then(function(body) {
            res.send(body);
        });
    })
    .return(res)
    .catch(theLib.callbackAndThrowError(cb));
};
