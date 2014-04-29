'use strict';

var path = require('path');


module.exports = {
    httpPort: 3000,
    wwwRoot: '/Volumes/GrandMasterKashik/archive/http',
    // !!!
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
};
