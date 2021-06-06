import theLib from '../lib/index';
import {
  STREAM_TITLE,
  trimmedPlaylist,
} from '../lib/playlist';


/**
 * Generates a [PLS-format](https://en.wikipedia.org/wiki/PLS_(file_format)) playlist
 * for [Sleepbot Environmental Broadcast](http://sleepbot.com/ambience/cgi/listen.pls)
 *
 * @see https://en.wikipedia.org/wiki/PLS_(file_format)
 * @see http://gonze.com/playlists/playlist-format-survey.html
 * @see http://forums.winamp.com/showthread.php?threadid=65772
 * @see https://datatracker.ietf.org/doc/html/rfc8216#section-4.3
 *
 * @function app.sebPlaylistPLS
 * @params {express.request} req
 * @params {express.response} res
 */
export default function middleware(req, res) {
  const sebServers = theLib.config.get('sebServers');

  const body = trimmedPlaylist(`
[playlist]
numberofentries=${ sebServers.length }
Version=2
  `
  + sebServers.map((server, index) => {
    const n = index + 1; // 1-based
    return `

File${ n }=${ server.streamUrl }
Title${ n }=${ STREAM_TITLE }
Length${ n }=-1

    `;
  }).join('\n'));

  res
  .set('Content-Type', 'audio/x-scpls')
  .status(200)
  .send(body);
}
