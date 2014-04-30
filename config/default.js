'use strict';

var path = require('path');


module.exports = {
    httpPort: 3000,
    wwwRoot: '/Volumes/GrandMasterKashik/archive/http',
    baseURL: 'http://www.sleepbot.com',
    // baseURL: 'http://sleepbot.localhost:8080',
    // baseURL: 'http://localhost:3000',

    sebServers: [
        { url: 'http://sc13.shoutcaststreaming.us:8194', primary: true, user: 'admin', pass: 'deepDeepSleep' },
        { url: 'http://sc7.shoutcaststreaming.us:8044' },
        { url: 'http://209.104.5.207:8096/seb' },
    ],
    get sebServerPrimary() {
        return this.sebServers.reduce(function(prior, current) {
            return current.primary ? current : prior;
        });
    },

    // http://tf.nist.gov/tf-cgi/servers.cgi
    ntpServers: [
        'nist1-nj2.ustiming.org',
        'nist1-ny2.ustiming.org',
        'nist1-pa.ustiming.org',
        'time-c.nist.gov',
        // 'time-d.nist.gov', // "All services via IPV6"
        'nist1-macon.macon.ga.us',
        'wolfnisttime.com',
        'nist1-chi.ustiming.org',
        'nist.time.nosc.us',
        'nist.netservicesgroup.com',
        'nisttime.carsoncity.k12.mi.us',
        'nist1-lnk.binary.net',
        'wwv.nist.gov',
        'time.nist.gov',
        'utcnist.colorado.edu',
        'utcnist2.colorado.edu',
        'ntp-nist.ldsbc.edu',
        'nist1-lv.ustiming.org',
        'nist-time-server.eoni.com',
        'nist1.symmetricom.com',
    ],
};
