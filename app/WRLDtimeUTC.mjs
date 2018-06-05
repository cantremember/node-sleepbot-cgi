import Promise from 'bluebird';
import net from 'net';

import theLib from '../lib/index';


// keeps Promising to try another one ...
const willTryServers = Promise.method((res, tried=[]) => {
  const servers = theLib.config.get('ntpServers');

  if (tried.length >= servers.length) {
    // they're ALL down?  we are Service Unavailable
    res.set('Content-Type', 'text/plain').status(503).end();
    return Promise.resolve();
  }

  // it's a multi-step Promise,
  //   1) choose a server
  //   2) connect -- error rejects
  return new Promise((resolve /*, reject */) => {
    // okay, any server we haven't tried yet ...
    let server;
    while (true) {
      server = theLib.chooseAny(servers);
      if (! tried.includes(server)) {
        break;
      }
    }
    tried.push(server);

    // Daytime Protocol
    //   https://tools.ietf.org/html/rfc867
    let connection = net.connect(13, server);
    connection.setTimeout(theLib.config.get('ntpTimeout'));


    // fail
    function failOn(topic) {
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

        // // assume it'll come back
        // delete servers[server];

        // keep on trying
        //   and there may be more Errors on the way,
        //   so don't release until the upstream is done
        resolve(
          willTryServers(res, tried).finally(release) // eslint-disable-line no-use-before-define
        );
      }

      connection.on(topic, listener);
      return listener;
    }
    const failOnError = failOn('error');
    const failOnTimeout = failOn('timeout');


    // accumulate
    const parts = [];

    function onData(data) {
      /* istanbul ignore if */
      if (! connection) {
        return;
      }
      parts.push(data.toString());
    }
    connection.on('data', onData);


    // succeed
    function succeedOn(topic) {
      function listener() {
        /* istanbul ignore if */
        if (! connection) {
          return;
        }

        // if it's non-blank, we've got what we want!
        if (parts.length !== 0) {
          const result = parts.join('\n');
          res.set('Content-Type', 'text/plain').status(200).send(result);

          resolve(result);
          release(); // eslint-disable-line no-use-before-define
          return;
        }

        // keep on trying
        //   and there may be more Errors on the way,
        //   so don't release until the upstream is done
        resolve(
          willTryServers(res, tried).finally(release) // eslint-disable-line no-use-before-define
        );
      }

      connection.on(topic, listener);
      return listener;
    }
    const succeedOnClose = succeedOn('close');
    const succeedOnEnd = succeedOn('end');


    // let go
    function release() {
      /* istanbul ignore if */
      if (! connection) {
        return;
      }

      connection.removeListener('close', succeedOnClose);
      connection.removeListener('end', succeedOnEnd);
      connection.removeListener('data', onData);
      connection.removeListener('error', failOnError);
      connection.removeListener('timeout', failOnTimeout);

      connection = undefined;
    }
  });
});


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
 * @params {Function} cb a callback invoked to continue down the Express middleware pipeline
 * @returns {Promise<express.response>} a Promise resolving `res`
 */
export default function handler(req, res, cb) {
  return willTryServers(res)
  .return(res)
  .catch(cb);
}
