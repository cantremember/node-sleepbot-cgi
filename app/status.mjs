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
 */
export default function middleware(req, res) {
  res.status(200).send(STATUS);
}
