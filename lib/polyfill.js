'use strict';

const _ = require('lodash');


// FIXME:  ReferenceError: Symbol is not defined
if (typeof Symbol === 'undefined') {
    global.Symbol = require('es6-symbol');
}


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
        return;
    }

    // FIXME:  TypeError: Array#includes is not a function
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
        return;
    }

    // FIXME:  TypeError: String#includes is not a function
    prototype.includes = String_includes;
})(String.prototype);


/**
 * Copy the values of all enumerable own properties from one or more source objects to a target object
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign
 * @param {Object} target The target object.
 * @param {Array<Object>} sources The source object(s).
 * @returns true or false as appropriate
 */
function Object_assign() {
    return _.assign.apply(Object, arguments);
}

((klass) => {
    const method = klass.assign;
    // istanbul ignore if
    if (typeof method === 'function')  {
        return;
    }

    // FIXME:  TypeError: Object.assign is not a function
    klass.assign = Object_assign;
})(Object);
