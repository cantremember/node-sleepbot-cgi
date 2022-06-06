import theLib from '../lib/index.mjs';
import {
  STREAM_TITLE,
  trimmedPlaylist,
} from '../lib/playlist.mjs';


/* eslint-disable max-len */
/**
 * Generates an [ASX-format](https://en.wikipedia.org/wiki/Advanced_Stream_Redirector) playlist
 * for [Sleepbot Environmental Broadcast](http://sleepbot.com/ambience/cgi/listen.asx)
 *
 * @see https://en.wikipedia.org/wiki/Advanced_Stream_Redirector
 * @see https://web.archive.org/web/20100315064515/http://www.microsoft.com/windows/windowsmedia/howto/articles/CustomizedExp.aspx
 * @see https://docs.microsoft.com/en-us/windows/win32/wmp/param-element
 *
 * @function app.sebPlaylistASX
 * @params {express.request} req
 * @params {express.response} res
 */
export default function middleware(req, res) {
  const sebServers = theLib.config.get('sebServers');

  const body = trimmedPlaylist(`
<ASX version="3.0">
  <TITLE>${ STREAM_TITLE }</TITLE>
  <PARAM name="HTMLView" value="http://sleepbot.com/seb" />
  `
  + sebServers.map((server) => `

  <ENTRY>
    <REF href="${ server.streamUrl }" />
    <TITLE>${ STREAM_TITLE }</TITLE>
    <PARAM name="HTMLView" value="http://sleepbot.com/seb" />
  </ENTRY>

  `).join('\n')
  + `
</ASX>
  `);

  res
  .set('Content-Type', 'video/x-ms-asf')
  .status(200)
  .send(body);
}
