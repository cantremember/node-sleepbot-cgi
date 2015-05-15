'use strict';

const assert = require('assert');

// apply the polyfill
require('../../lib/polyfill');


describe('Array', () => {
    describe('#includes', () => {
        it('is polyfilled', () => {
            assert([ 1, 2, 3 ].includes(2));
            assert(! [ 1, 2, 3 ].includes(4));
            assert(! [ 1, 2, 3 ].includes(3, 3));
            assert([ 1, 2, 3 ].includes(3, -1));
            // assert([ 1, 2, NaN ].includes(NaN));
        });
    });
});


describe('String', () => {
    describe('#includes', () => {
        it('is polyfilled', () => {
            const str = 'To be, or not to be, that is the question.';

            assert(str.includes('To be'));
            assert(str.includes('question'));
            assert(! str.includes('nonexistant'));
            assert(! str.includes('To be', 1));
            assert(! str.includes('TO BE'));
        });
    });
});
