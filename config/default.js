'use strict';

var path = require('path');


module.exports = {
    httpPort: 3000,
    wwwRoot: '/Volumes/GrandMasterKashik/archive/http',

    sebServers: [
        { url: 'http://sc13.shoutcaststreaming.us:8194', primary: true },
        { url: 'http://sc7.shoutcaststreaming.us:8044' },
        { url: 'http://209.104.5.207:8096/seb' },
    ],
    get sebServerPrimary() {
        return this.sebServers.reduce(function(prior, current) {
            return current.primary ? current : prior;
        });
    },
};
