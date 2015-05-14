'use strict';

// TODO:
//   support req.params.format, M3U, etc.
//   is M3U just a single line with a URL?

var theLib = require('../lib/index');
var sebServers = theLib.config.get('sebServers');


// capture the app
module.exports = function handler(req, res) {
    // http://gonze.com/playlists/playlist-format-survey.html
    //   "A proprietary format used for playing Shoutcast and Icecast streams"
    //   audio/mpegurl
    //   audio/x-mpegurl
    res.set('Content-Type', 'audio/x-scpls');

    res.send([
        '[playlist]',
        'numberofentries=' + sebServers.length,
        'Version=2',
    ].concat(sebServers.map(function(server, index) {
        var n = index + 1;
        return [
            'File' +   n + '=' + server.url,
            'Title' +  n + '=Sleepbot Environmental Broadcast',
            'Length' + n + '=-1',
            // jscs:disable maximumLineLength
            // jshint maxlen: false
            // Browser1=http://www.winamp.com/bin/sc/sccontext.php?title=Sleepbot+Environmental+Broadcast&genre=Ambient+Downtempo&url=http%3A%2F%2Fsleepbot.com%2Fseb
            // jscs:enable
        ].join('\n');
    })).join('\n') + '\n');
};
