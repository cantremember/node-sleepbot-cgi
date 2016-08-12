const assert = require('assert');

/* eslint-disable camelcase */
// apply the polyfill
import {
    Array_includes,
    String_includes,
    Object_assign,
} from '../../lib/polyfill';
/* eslint-enable camelcase */


describe('Array', () => {
    describe('#includes', () => {
        it('is implemented', () => {
            assert(Array_includes.call([ 1, 2, 3 ], 2));
            assert(! Array_includes.call([ 1, 2, 3 ], 4));
            assert(! Array_includes.call([ 1, 2, 3 ], 3, 3));
            assert(Array_includes.call([ 1, 2, 3 ], 3, -1));
            // assert(Array_includes.call([ 1, 2, NaN ], NaN));
        });

        it('is polyfilled', () => {
            assert([ 1 ].includes(1));
        });
    });
});


describe('String', () => {
    describe('#includes', () => {
        const STR = 'To be, or not to be, that is the question.';

        it('is implemented', () => {
            assert(String_includes.call(STR, 'To be'));
            assert(String_includes.call(STR, 'question'));
            assert(! String_includes.call(STR, 'nonexistant'));
            assert(! String_includes.call(STR, 'To be', 1));
            assert(! String_includes.call(STR, 'TO BE'));
        });

        it('is polyfilled', () => {
            assert(STR.includes('To be'));
        });
    });
});


describe('Object', () => {
    describe('assign', () => {
        it('is implemented', () => {
            assert.deepEqual(
                Object_assign({ a: 1, b: 99 }, { b: 2, c: 3 }), // eslint-disable-line new-cap
                { a: 1, b: 2, c: 3 }
            );
        });

        it('is polyfilled', () => {
            assert.deepEqual(
                Object.assign({ a: 1, b: 99 }, { b: 2, c: 3 }),
                { a: 1, b: 2, c: 3 }
            );
        });
    });
});
