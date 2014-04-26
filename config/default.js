'use strict';

module.exports = {
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
