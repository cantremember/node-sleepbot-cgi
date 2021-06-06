import theLib from '../lib/index';
import {
  STREAM_TITLE,
  trimmedPlaylist,
} from '../lib/playlist';


/**
 * Generates an [M3U-format](https://en.wikipedia.org/wiki/M3U) playlist
 * for [Sleepbot Environmental Broadcast](http://sleepbot.com/ambience/cgi/listen.m3u)
 *
 * @see https://en.wikipedia.org/wiki/M3U
 *
 * @function app.sebPlaylistM3U
 * @params {express.request} req
 * @params {express.response} res
 */
export default function middleware(req, res) {
  const sebServers = theLib.config.get('sebServers');

  const body = trimmedPlaylist(`
#EXTM3U
  `
  + sebServers.map((server) => `

#EXTINF:-1,${ STREAM_TITLE }
${ server.streamUrl }

  `).join('\n'));

  res
  .set('Content-Type', 'application/vnd.apple.mpegurl')
  .status(200)
  .send(body);
}
