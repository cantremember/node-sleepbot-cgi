'use strict';

var SERVERS = [
    'http://sc13.shoutcaststreaming.us:8194',
    'http://sc7.shoutcaststreaming.us:8044',
    'http://209.104.5.207:8096/seb',
];

// capture the app
module.exports = function(app) {
    return function(req, res, cb) {
        // http://gonze.com/playlists/playlist-format-survey.html
        //   "A proprietary format used for playing Shoutcast and Icecast streams"
        //   audio/mpegurl
        //   audio/x-mpegurl
        res.set('Content-Type', 'audio/x-scpls');
        res.send([
            '[playlist]',
            'numberofentries=' + SERVERS.length,
            'Version=2',
        ].concat(SERVERS.map(function(server, index) {
            var n = index + 1;
            return [
                'File' +   n + '=' + server,
                'Title' +  n + '=Sleepbot Environmental Broadcast',
                'Length' + n + '=-1',
                // Browser1=http://www.winamp.com/bin/sc/sccontext.php?title=Sleepbot+Environmental+Broadcast&genre=Ambient+Downtempo&url=http%3A%2F%2Fsleepbot.com%2Fseb
            ].join('\n');
        })).join('\n') + '\n');
    };
};
