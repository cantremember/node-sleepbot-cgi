import theLib from '../lib/index.mjs';
import {
  trimmedPlaylist,
} from '../lib/playlist.mjs';


/**
 * Generates an RM-format playlist
 * for [Sleepbot Environmental Broadcast](http://sleepbot.com/ambience/cgi/listen.rm)
 *
 * This is a legacy RealMedia format that seems to have no public documentation
 * of the form being used here.
 *
 * @function app.sebPlaylistRM
 * @params {express.request} req
 * @params {express.response} res
 */
export default function middleware(req, res) {
  const sebServers = theLib.config.get('sebServers');

  // yeah.  just a list of URLs
  const body = trimmedPlaylist(
    sebServers.map((server) => server.streamUrl).join('\n')
  );

  res
  .set('Content-Type', 'application/vnd.rn-realmedia')
  .status(200)
  .send(body);
}
