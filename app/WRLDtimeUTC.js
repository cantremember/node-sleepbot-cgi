'use strict';

var Promise = require('bluebird');
var net = require('net');
var theLib = require('../lib/index');


// keeps Promising to try another one ...
var willTryServers = function willTryServers(res, tried) {
    var servers = theLib.config.get('ntpServers');

    // state
    tried = tried || [];

    // it's a multi-step Promise,
    //   1) choose a server
    //   2) connect -- error rejects
    var deferred = Promise.defer();

    if (tried.length >= servers.length) {
        // they're ALL down?  we are SO DONE
        res.status(418);
        return Promise.reject(new Error("I'm a teapot"));
    };

    // okay, any server we haven't tried yet ...
    var server;
    while (true) {
        server = theLib.chooseAny(servers);
        if (tried.indexOf(server) === -1) {
            break;
        }
    }
    tried.push(server);

    console.log('trying', server);

    // Daytime Protocol
    //   https://tools.ietf.org/html/rfc867
    var connection = net.connect(13, server);
    var parts = [];

    // fail
    var failOn = function(queue) {
        connection && connection.on(queue, function() {
            var msg = 'Daytime Protocol FAIL: ' + server;
            console.error(msg);

            // assume it'll come back
            //delete servers[server];

            // keep on trying, ASAP
            process.nextTick(function() {
                return deferred.resolve(willTryServers(res, tried));
            })
        });
    };
    failOn('error');
    failOn('timeout');

    // accumulate
    connection && connection.on('data', function(data) {
        parts.push(data.toString());
    });

    // succeed
    var succeedOn = function(queue) {
        connection && connection.on(queue, function() {
            // we're done with you
            connection = null;

            // if it's non-blank, we've got what we want!
            var result = parts.join("\n");
            if (result) {
                res.send(result);
                return deferred.resolve(result);
            }

            // keep on trying, ASAP
            process.nextTick(function() {
                return deferred.resolve(willTryServers(res, tried));
            })
        });
    };
    succeedOn('close');
    succeedOn('end');

    // otherwise, we'll get back to you on that
    return deferred.promise;
};


module.exports = function handler(req, res, cb) {
    return willTryServers(res).error(theLib.callbackAndThrowError(cb));
};
