#!/usr/bin/env node
//
// https://github.com/flatiron/nconf

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

app.get('/', function(req, res){
  res.send('hello world');
});

app.listen(params.port);
