'use strict';


/**
 * Determines whether an array includes a certain element
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/includes
 * @param {Object} searchElement The element to search for.
 * @param {Integer} [fromIndex] The position in this array at which to begin searching for `searchElement`;
 *   defaults to 0.
 * @returns true or false as appropriate
 */
function Array_includes() {
    return (this.indexOf.apply(this, arguments) !== -1);
}

((prototype) => {
    const method = prototype.includes;
    // istanbul ignore if
    if (typeof method === 'function')  {
        if (method === Array_includes) {
            return;
        }
        throw new TypeError('Array#includes no longer needs a polyfill');
    }

    prototype.includes = Array_includes;
})(Array.prototype);


/**
 * Determines whether one string may be found within another string
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/includes
 * @param {String} searchString A string to be searched for within this string.
 * @param {Integer} [fromIndex] The position in this string at which to begin searching for `searchString`;
 *   defaults to 0.
 * @returns true or false as appropriate
 */
function String_includes() {
    return (this.indexOf.apply(this, arguments) !== -1);
}

((prototype) => {
    const method = prototype.includes;
    // istanbul ignore if
    if (typeof method === 'function')  {
        if (method === String_includes) {
            return;
        }
        throw new TypeError('String#includes no longer needs a polyfill');
    }

    prototype.includes = String_includes;
})(String.prototype);
