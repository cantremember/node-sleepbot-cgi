'use strict';


var theLib = require('../lib/index');
var sebServers = theLib.config.get('sebServers');


/**
 * Generates an [M3U-format](https://en.wikipedia.org/wiki/M3U) playlist
 * for [Sleepbot Environmental Broadcast](http://sleepbot.com/ambience/cgi/listen.pls)
 *
 * &nbsp;
 *
 * @todo Support req.params.format, M3U, etc.
 * @todo is M3U just a single line with a URL?
 *
 * @see http://sleepbot.com/ambience/cgi/listen.cgi
 * @function app.sebPlaylist
 * @params {express.request} req
 * @params {express.response} res
 * @params {Function} cb a callback invoked to continue down the Express middleware pipeline
 */
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
