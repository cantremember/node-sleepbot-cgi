import lodash from 'lodash';


export const STREAM_TITLE = 'Sleepbot Environmental Broadcast - - sleepbot.com/seb/';


export function trimmedPlaylist(text) {
  const lines = text.split(/\n/g);
  const trimmed = lines.map((line) => line.replace(/[\s]+$/, ''));

  return lodash.compact(trimmed).join('\n') + '\n';
}
