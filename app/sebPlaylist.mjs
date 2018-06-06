import theLib from '../lib/index';


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
 */
export default function middleware(req, res) {
  const sebServers = theLib.config.get('sebServers');

  // http://gonze.com/playlists/playlist-format-survey.html
  //   "A proprietary format used for playing Shoutcast and Icecast streams"
  //   audio/mpegurl
  //   audio/x-mpegurl
  const body = [
    '[playlist]',
    'numberofentries=' + sebServers.length,
    'Version=2',
  ].concat(sebServers.map((server, index) => {
    const n = index + 1;
    return [
      'File' +   n + '=' + server.url,
      'Title' +  n + '=Sleepbot Environmental Broadcast',
      'Length' + n + '=-1',
      /* eslint-disable max-len */
      // Browser1=http://www.winamp.com/bin/sc/sccontext.php?title=Sleepbot+Environmental+Broadcast&genre=Ambient+Downtempo&url=http%3A%2F%2Fsleepbot.com%2Fseb
      /* eslint-enable max-len */
    ].join('\n');
  })).join('\n') + '\n';

  res
  .set('Content-Type', 'audio/x-scpls')
  .status(200)
  .send(body);
}
