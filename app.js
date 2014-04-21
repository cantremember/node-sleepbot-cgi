#!/usr/bin/env node

// https://github.com/flatiron/nconf
// http://expressjs.com/4x/api.html
// http://flippinawesome.org/2014/04/07/the-basics-of-express-routes/
// https://github.com/nodejitsu/forever

var path = require('path');
var params = (function() {
    var argv = process.argv;
    var i = argv.indexOf(__filename);
    var rest = argv.slice(i + 1);

    var minimist = require('minimist');
    return minimist(rest, {
        alias: { port: 'p' }
    });
})();

if (! params.port) {
    console.error(['Usage:  ', path.basename(__filename), ' --port <PORT>'].join(''));
    process.exit(1);
}


var express = require('express');
var app = express();

app.get('*', function(req, res, cb) {
    res.send(req.path);
});

app.listen(params.port);
