'use strict';

var Promise = require('bluebird');
var _und = require('underscore');
var theLib = require('../lib/index');

// TODO: timezone support
var timeZoneOffset = 0;

// column -> index mapping
var liveColumns = theLib.columnToIndexMap('file anchor year month day hourStart hourEnd');
var showColumns = theLib.columnToIndexMap('file anchor dayOfWeek hourStart hourEnd');
var quipColumns = theLib.columnToIndexMap('text');
var dayOfWeekNames = 'Sunday Monday Tuesday Wednesday Thursday Friday Saturday'.split(/\s/); // 0-based
var dayOfWeekAnchors = 'SUN MON TUE WED THU FRI SAT'.split(/\s/); // 0-based

var coerceData = function coerceData(data) {
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
};

var scrapeBodyTitle = function parseSchedule(data, lines, start, titleStart, end) {
    if (_und.isUndefined(end)) {
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
    data.body = body.join("\n");
    return data;
}


/*
   the dead file
*/
var loadDead = theLib.willMemoize(function() {
    return theLib.wwwRoot.willLoadFile('fucc/dead.txt');
});


/*
   the live file
*/
var isLiveNow = function(data, date) {
    // exact date match
    if ((data.year !== date.getFullYear()) || (data.month !== date.getMonth()) || (data.day !== date.getDate())) {
        return false;
    }
    // and within the hour range
    var hour = date.getHours();
    return (hour >= data.hourStart) && (hour < data.hourEnd);
};
var loadLives = theLib.willMemoize(function() {
    var datas;
    return theLib.wwwRoot.willLoadCSV('fucc/live.txt').then(function(rows) {
        // coerce & cache
        datas = rows.map(function(row) {
            var data = theLib.dataColumnMap(row, liveColumns);
            data = coerceData(data);
            data.type = 'live';

            // 2-digit year
            var yy = parseInt(data.year, 10);
            data.year = yy + (yy < 500 ? 1900 : 0);

            return data;
        });

        // the live schedule, for scrape-age
        return theLib.wwwRoot.willLoadFile('fucc/live.html');
    }).then(function(page) {
        var lines = (page || '').split("\n");

        return datas.map(function(data) {
            return scrapeBodyTitle(data, lines,
                new RegExp('^<A NAME="' + data.anchor + '">'),
                /^<A NAME=/
            );
        });
    });
});
var checkLive = function(date) {
    // load up the rows & cache
    return loadLives().then(function(datas) {
        // the first one that's live
        return datas && datas.filter(function(data) {
            return isLiveNow(data, date);
        })[0];
    });
};

/*
   the show file
*/
var isShowNow = function(data, date) {
    // same day of the week (0-based)
    if (data.dayOfWeek !== date.getDay()) {
        return false;
    }
    // and within the hour range
    var hour = date.getHours();
    return (hour >= data.hourStart) && (hour < data.hourEnd);
};
var loadShows = theLib.willMemoize(function() {
    var datas;
    return theLib.wwwRoot.willLoadCSV('fucc/show.txt').then(function(rows) {
        // coerce & cache
        datas = rows.map(function(row) {
            var data = theLib.dataColumnMap(row, showColumns);
            data = coerceData(data);
            data.type = 'show';

            return data;
        });

        // the show schedule, for scrape-age
        return theLib.wwwRoot.willLoadFile('fucc/show.html');
    }).then(function(page) {
        var lines = (page || '').split("\n");
        var rows = checkLive.rows;

        return datas.map(function(data) {
            return scrapeBodyTitle(data, lines,
                new RegExp('^<A NAME="' + data.anchor + '">'),
                /^<!-- start -->/,
                /^<!-- end -->/
            );
        });
    });
});
var checkShow = function(date) {
    // load up the rows & cache
    return loadShows().then(function(datas) {
        // the first one that's live
        return datas && datas.filter(function(data) {
            return isShowNow(data, date);
        })[0];
    })
};


/*
   the quip file
*/
var loadQuips = theLib.willMemoize(function() {
    return theLib.wwwRoot.willLoadCSV('fucc/showquip.txt');
});


module.exports = function handler(req, res, cb) {
    var dead, current;
    var quip;
    var date = new Date(), day = date.getDay();

    return loadDead().then(function(_dead) {
        dead = _dead;
        if (dead || current) {
            // we're done
            return Promise.resolve();
        }
        return checkLive(date);
    }).then(function(_live) {
        current = current || _live;
        if (dead || current) {
            // we're done
            return Promise.resolve();
        }
        return checkShow(date);
    }).then(function(_show) {
        current = current || _show;

        return loadQuips();
    }).then(function(rows) {
        // choose a random quip
        quip = theLib.dataColumnMap(theLib.chooseAny(rows), quipColumns);
    }).then(function() {
        return Promise.promisify(res.render, res)('fuccSchedule.ejs', {
            config: theLib.config,
            dead: dead,
            current: current,
            quip: quip,
            date: date,
            dayOfWeekName: dayOfWeekNames[day],
            dayOfWeekAnchor: dayOfWeekAnchors[day],
        });
    }).then(function(body) {
        res.send(body);
    }).error(theLib.callbackAndThrowError(cb));
};
