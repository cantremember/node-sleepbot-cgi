'use strict';

var path = require('path');


/**
 * Default configuration.
 *
 * @member config.default
 */
module.exports = {
    httpPort: 3000,
    wwwRoot: '/mnt/ec2-http/sleepbot.com',
    baseURL: 'http://www.sleepbot.com',
    caching: false,

    viewsRoot: path.resolve(
        path.join(__dirname, '../views') // relative to *me*
    ),

    sebServers: [
        { url: 'http://sc13.shoutcaststreaming.us:8194', primary: true, user: 'admin', pass: 'deepDeepSleep' },
        { url: 'http://sc7.shoutcaststreaming.us:8044' },
        { url: 'http://209.104.5.207:8096/seb' },
    ],
    get sebServerPrimary() {
        return this.sebServers.reduce(function(prior, current) {
            return current.primary ? /* istanbul ignore next */ current : prior;
        });
    },

    // http://tf.nist.gov/tf-cgi/servers.cgi
    ntpServers: [
        'nist.netservicesgroup.com',
        'nist1-lv.ustiming.org',
        'nist1-macon.macon.ga.us',
        'nist1-pa.ustiming.org',
        'nisttime.carsoncity.k12.mi.us',
        'ntp-nist.ldsbc.edu',
        'time-a.nist.gov',
        'time-a.timefreq.bldrdoc.gov',
        'time-b.nist.gov',
        'time-b.timefreq.bldrdoc.gov',
        'time-c.nist.gov',
        'time-c.timefreq.bldrdoc.gov',
        'time-d.nist.gov',
        'utcnist.colorado.edu',
        // 'nist-time-server.eoni.com',
        // 'nist.time.nosc.us',
        // 'nist1-chi.ustiming.org',
        // 'nist1-lnk.binary.net',
        // 'nist1-nj2.ustiming.org',
        // 'nist1-ny2.ustiming.org',
        // 'nist1.symmetricom.com',
        // 'time-nw.nist.gov',
        // 'time.nist.gov',
        // 'utcnist2.colorado.edu',
        // 'wolfnisttime.com',
        // 'wwv.nist.gov',
    ],
    ntpTimeout: 3000, // 3s
};
