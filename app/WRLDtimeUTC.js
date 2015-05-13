'use strict';

var Promise = require('bluebird');
var net = require('net');
var theLib = require('../lib/index');


// keeps Promising to try another one ...
var willTryServers = Promise.method(function willTryServers(res, tried) {
    var servers = theLib.config.get('ntpServers');

    // state
    tried = tried || [];

    // it's a multi-step Promise,
    //   1) choose a server
    //   2) connect -- error rejects
    var deferred = Promise.defer();

    if (tried.length >= servers.length) {
        // they're ALL down?  we are Service Unavailable
        res.set('Content-Type', 'text/plain').status(503).end();
        return;
    }

    // okay, any server we haven't tried yet ...
    var server;
    while (true) {
        server = theLib.chooseAny(servers);
        if (tried.indexOf(server) === -1) {
            break;
        }
    }
    tried.push(server);

    // Daytime Protocol
    //   https://tools.ietf.org/html/rfc867
    var connection = net.connect(13, server);
    connection.setTimeout(theLib.config.get('ntpTimeout'));

    // fail
    var failOn = function(topic) {
        connection.on(topic, function(err) {
            if (! connection) {
                return;
            }
            connection = null;

            if (err instanceof Error) {
                console.error('Daytime Protocol ERROR:', server, err);
            }
            else {
                console.error('Daytime Protocol FAIL:', server);
            }

            // // assume it'll come back
            // delete servers[server];

            // keep on trying
            return deferred.resolve(willTryServers(res, tried));
        });
    };
    failOn('error');
    failOn('timeout');

    // accumulate
    var parts = [];

    connection.on('data', function(data) {
        if (! connection) {
            return;
        }
        parts.push(data.toString());
    });

    // succeed
    var succeedOn = function(topic) {
        connection.on(topic, function() {
            if (! connection) {
                return;
            }
            connection = null;

            // if it's non-blank, we've got what we want!
            if (parts.length !== 0) {
                var result = parts.join('\n');
                res.send(result);
                return deferred.resolve(result);
            }

            // keep on trying
            return deferred.resolve(willTryServers(res, tried));
        });
    };
    succeedOn('close');
    succeedOn('end');

    // otherwise, we'll get back to you on that
    return deferred.promise;
});


module.exports = function handler(req, res, cb) {
    return willTryServers(res)
    .return(res)
    .catch(theLib.callbackAndThrowError(cb));
};
