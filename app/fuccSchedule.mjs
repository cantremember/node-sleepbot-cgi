import wwwRoot from '../lib/wwwRoot';
import theLib from '../lib/index';


// // TODO: timezone support
// const timeZoneOffset = 0;

// column -> index mapping
const LIVE_COLUMNS = theLib.columnToIndexMap('file anchor year month day hourStart hourEnd');
const SHOW_COLUMNS = theLib.columnToIndexMap('file anchor dayOfWeek hourStart hourEnd');
const QUIP_COLUMNS = theLib.columnToIndexMap('text');
const DAY_OF_WEEK_NAMES = 'Sunday Monday Tuesday Wednesday Thursday Friday Saturday'.split(/\s/); // 0-based
const DAY_OF_WEEK_ANCHORS = 'SUN MON TUE WED THU FRI SAT'.split(/\s/); // 0-based

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

function scrapeBodyTitle( // eslint-disable-line max-params
  data,
  lines,
  start,
  ...args //, titleStartArg?, endArg
) {
  const end = args.pop();
  const titleStart = args.pop(); // optional
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

      default:
        // that's the end of it
    }
  }

  // stringify
  data.body = body.join('\n');
  return data;
}


/*
   the dead file
*/
const willLoadDead = theLib.willMemoize(async () => {
  try {
    const file = await wwwRoot.willLoadFile('fucc/dead.txt');
    return file;
  }
  catch (err) /* istanbul ignore next */ {
    return undefined;
  }
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

const willLoadLives = theLib.willMemoize(async () => {
  const [ rows, page ] = await Promise.all([
    wwwRoot.willLoadTSV('fucc/live.txt'),
    wwwRoot.willLoadFile('fucc/live.html'), // the live schedule, for scrape-age
  ]);

  // coerce
  const datas = rows.map((row) => {
    const data = coerceData(theLib.dataColumnMap(row, LIVE_COLUMNS));
    data.type = 'live';

    // 2-digit year
    const yy = parseInt(data.year, 10);
    data.year = yy + (yy < 500 ? 1900 : /* istanbul ignore next */ 0);

    return data;
  });

  // scrape
  const lines = (page || '').split('\n');
  return datas.map((data) => {
    return scrapeBodyTitle(data, lines,
      new RegExp('^<A NAME="' + data.anchor + '">'),
      /^<A NAME=/
    );
  });
});

async function checkLive(date) {
  try {
    // load up the rows
    const datas = await willLoadLives();

    // the first one that's live
    return datas && datas.filter((data) => {
      return isLiveNow(data, date);
    })[0];
  }
  catch (err) {
    // treat as no match
    return undefined;
  }
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

const willLoadShows = theLib.willMemoize(async () => {
  const [ rows, page ] = await Promise.all([
    wwwRoot.willLoadTSV('fucc/show.txt'),
    wwwRoot.willLoadFile('fucc/show.html'), // the show schedule, for scrape-age
  ]);

  // coerce
  const datas = rows.map((row) => {
    const data = coerceData(theLib.dataColumnMap(row, SHOW_COLUMNS));
    data.type = 'show';

    return data;
  });

  // scrape
  const lines = (page || '').split('\n');
  return datas.map((data) => {
    return scrapeBodyTitle(data, lines,
      new RegExp('^<A NAME="' + data.anchor + '">'),
      /^<!-- start -->/,
      /^<!-- end -->/
    );
  });
});

async function checkShow(date) {
  try {
    // load up the rows
    const datas = await willLoadShows();

    // the first one that's live
    return datas && datas.filter((data) => {
      return isShowNow(data, date);
    })[0];
  }
  catch (err) {
    // treat as no match
    return undefined;
  }
}


/*
   the quip file
*/
const willLoadQuips = theLib.willMemoize(async () => {
  const file = await wwwRoot.willLoadTSV('fucc/showquip.txt');
  return file;
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
 * @params {Function} next a callback invoked to continue down the Express middleware pipeline
 * @returns {Promise<express.response>} a Promise resolving `res`
 */
export default async function middleware(req, res, next) {
  const date = new Date();
  const day = date.getDay();

  try {
    const dead = await willLoadDead();
    const live = await ((dead) ? undefined : checkLive(date));
    const show = await ((dead || live) ? undefined : checkShow(date));
    const quips = await willLoadQuips();

    // choose a random quip
    const quip = theLib.dataColumnMap(theLib.chooseAny(quips), QUIP_COLUMNS) || /* istanbul ignore next */ FAKE_QUIP;

    const body = await theLib.willRenderView(res, 'fuccSchedule.ejs', {
      config: theLib.config,
      dead,
      current: (live || show),
      quip,
      date,
      dayOfWeekName: DAY_OF_WEEK_NAMES[day],
      dayOfWeekAnchor: DAY_OF_WEEK_ANCHORS[day],
    });
    res.status(200).send(body);

    return res;
  }
  catch (err) {
    next(err);
    return res;
  }
}
