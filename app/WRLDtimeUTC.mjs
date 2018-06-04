const Promise = require('bluebird');
const net = require('net');

const theLib = require('../lib/index');


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
            connection.on(topic, (err) => {
                if (! connection) {
                    return;
                }
                connection = null;

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
                resolve(willTryServers(res, tried));
                return;
            });
        }
        failOn('error');
        failOn('timeout');

        // accumulate
        const parts = [];

        connection.on('data', (data) => {
            if (! connection) {
                return;
            }
            parts.push(data.toString());
        });

        // succeed
        function succeedOn(topic) {
            connection.on(topic, () => {
                if (! connection) {
                    return;
                }
                connection = null;

                // if it's non-blank, we've got what we want!
                if (parts.length !== 0) {
                    const result = parts.join('\n');
                    res.send(result);
                    resolve(result);
                    return;
                }

                // keep on trying
                resolve(willTryServers(res, tried));
                return;
            });
        }
        succeedOn('close');
        succeedOn('end');
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
module.exports = function handler(req, res, cb) {
    return willTryServers(res)
    .return(res)
    .catch(cb);
};
