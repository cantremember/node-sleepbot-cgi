const STATUS = Object.freeze({
  ok: true
});


/**
 * Returns a JSON document representing CGI site status for [Sleepbot Constructs](http://sleepbot.com/status.cgi).
 *
 * ```javascript
 * { "ok": true }
 * ```
 *
 * &nbsp;
 *
 * @see http://sleepbot.com/status.cgi
 * @function app.status
 * @params {express.request} req
 * @params {express.response} res
 * @params {Function} cb a callback invoked to continue down the Express middleware pipeline
 */
export default function handler(req, res) {
  res.send(STATUS);
}
