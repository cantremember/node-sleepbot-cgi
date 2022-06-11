import net from 'net';
import { shuffle } from 'lodash-es';

import theLib from '../lib/index.mjs';


/**
 * Actually, this is a darn good use of Promises
 * because of the nested chain-on-failure strategy.
 *
 * An async / await version is possible,
 * but this is a good classic Promise reference example to keep around.
 *
 * @params {express.response} res
 * @returns {Promise<String>} a Promise resolving an `ntp` representation
 */
async function willTryServers(res) { // eslint-disable-line require-await
  const servers = shuffle( theLib.config.get('ntpServers') );

  // it's a multi-step Promise,
  //   1) choose a server
  //   2) connect -- error rejects
  for await (const server of servers) {
    // a deferred Promise -- we will not reject using this implementation
    let _resolveForServer;
    const _promiseForServer = new Promise((resolve) => { _resolveForServer = resolve; });


    // Daytime Protocol
    //   https://tools.ietf.org/html/rfc867
    let connection = net.connect(13, server);
    connection.setTimeout(theLib.config.get('ntpTimeout'));


    // fail
    function _failOn(topic) {
      function listener(err) {
        /* istanbul ignore if */
        if (! connection) {
          return;
        }

        /* eslint-disable no-console */
        if (err instanceof Error) {
          console.error('Daytime Protocol ERROR:', server, err);
        }
        else {
          console.error('Daytime Protocol FAIL:', server);
        }
        /* eslint-enable no-console */

        // this one is no good -- try the next one
        _resolveForServer(null);
      }

      connection.on(topic, listener);
      return listener;
    }
    const failOnError = _failOn('error');
    const failOnTimeout = _failOn('timeout');


    // accumulate
    const parts = [];

    function _onData(data) {
      /* istanbul ignore if */
      if (! connection) {
        return;
      }
      parts.push(data.toString());
    }
    connection.on('data', _onData);


    // succeed
    function _succeedOn(topic) {
      function listener() {
        /* istanbul ignore if */
        if (! connection) {
          return;
        }

        // if it's non-blank, we've got what we want!
        if (parts.length !== 0) {
          const result = parts.join('\n');

          _resolveForServer(result);
          return;
        }

        // this one is no good -- try the next one
        _resolveForServer(null);
      }

      connection.on(topic, listener);
      return listener;
    }
    const succeedOnClose = _succeedOn('close');
    const succeedOnEnd = _succeedOn('end');


    // let go
    function _release() {
      /* istanbul ignore if */
      if (! connection) {
        return;
      }

      connection.removeListener('close', succeedOnClose);
      connection.removeListener('end', succeedOnEnd);
      connection.removeListener('data', _onData);
      connection.removeListener('error', failOnError);
      connection.removeListener('timeout', failOnTimeout);

      connection = undefined;
    }


    const result = await _promiseForServer;
    _release();

    if (result) {
      res
      .set('Content-Type', 'text/plain')
      .status(200)
      .send(result);

      return Promise.resolve();
    }
  }


  // they're ALL down?  we are Service Unavailable
  res.set('Content-Type', 'text/plain').status(503).end();
  return Promise.resolve();
}


/**
 * Proxies a response from a pool of [NTP](https://tools.ietf.org/html/rfc5905) servers
 * for use in time-aligning a [WRLD.time](http://sleepbot.com/WRLDtime/cgi/utc.cgi) clock
 *
 * &nbsp;
 *
 * @see http://sleepbot.com/WRLDtime/cgi/utc.cgi
 * @function app.WRLDtimeUTC
 * @params {express.request} req
 * @params {express.response} res
 * @params {Function} next a callback invoked to continue down the Express middleware pipeline
 * @returns {Promise<express.response>} a Promise resolving `res`
 */
export default async function middleware(req, res, next) {
  try {
    await willTryServers(res);
    return res;
  }
  catch (err) {
    next(err);
    return res;
  }
}
