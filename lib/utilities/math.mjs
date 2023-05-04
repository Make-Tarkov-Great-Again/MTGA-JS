
/** Clamp value between min and max
 * @param {number} value (number)
 * @param {number} a (number) min
 * @param {number} b (number) max
 * @returns (number) Clamped value
 */
const clamp = (value, a, b) => Math.max(a, Math.min(b, value));

const getRandomInt = (min = 0, max = 100) => {
    min = Math.floor(min);
    max = Math.floor(max);
    return (max > min) ? Math.floor(Math.random() * (max - min + 1) + min) : min;
}

/** Used to get percentage between two numbers
 * @param {number} num1 first number input
 * @param {number} num2 second number input
*/
const getPercentDiff = (num1, num2) => ((num1 / num2) * 100);


/** Used to get percentage difference between two numbers
 * @param {number} num1 first number input (percentage)
 * @param {number} num2 second number input (value to get percentage of)
 */
const getPercentOf = (num1, num2) => ((num1 / 100) * num2);


/** true if lucky, false if unlucky
 * @param {number} percentage 
 * @returns bool
 */
const getPercentRandomBool = ({ percentage = 50 } = {}) => {
    return (Math.random() * 100 | 0) < percentage;
};


/**
 * Decimal adjustment of a number.
 *
 * @param {String}  type  The type of adjustment - round, Math.floor, ceil
 * @param {Number}  value The number.
 * @param {Integer} exp   The exponent (the 10 logarithm of the adjustment base).
 * @returns {Number}      The adjusted value.
 */
const decimalAdjust = (type, value, exp = -1) => {
    // If the exp is undefined or zero...
    if (typeof exp === 'undefined' || +exp === 0) {
        return Math[type](value);
    }
    value = +value;
    exp = +exp;
    // If the value is not a number or the exp is not an integer...
    if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
        return NaN;
    }
    // Shift
    value = value.toString().split('e');
    value = Math[type](+(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp)));
    // Shift back
    value = value.toString().split('e');
    return +(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp));
}

export const decimalRound = decimalAdjust.bind(undefined, 'round');


/** extension for getRandomInt(1, max)
 * @param {number} max 
 * @returns number
 */
const getRandomIntEx = (max) => {
    return getRandomInt(1, max);
}

const float = (min, max) => {
    return Math.random() * (max - min) + min
}

/**
 * @param {number} min 
 * @param {number} max 
 * @returns {number}
 */
const getRandomIntInc = (min, max) => {
    return getRandomInt(Math.random() * (Math.round(max) - Math.round(min) + 1) + Math.round(min));
}

/**
 * Create random amount of numbers that equal total
 * @param {int} total 
 * @returns {<Promise> arr}
 */
const getRandomSplitInt = (total) => {
    const output = [];
    while (total > 0) {
        const sum = Math.round(Math.random() * total);
        output.push(sum);
        total -= sum;
    }
    return output;
}

const valueBetween = (value, inputMin, inputMax, outputMin, outputMax) => {
    const inputRange = inputMax - inputMin;
    const outputRange = outputMax - outputMin;

    // If the value is less than the minimum input value, return the minimum output value
    if (value < inputMin) {
        return outputMin;
    }

    // If the value is greater than the maximum input value, return the maximum output value
    if (value > inputMax) {
        return outputMax;
    }

    // Map the value from the input range to the output range
    return ((value - inputMin) / inputRange) * outputRange + outputMin;
}


const getRandomFromArray = (array) => {
    const idx = Math.floor(Math.random() * array.length);
    return array[idx];
}


const getRandomFromObject = (obj) => {
    const keys = Object.keys(obj);
    return obj[keys[keys.length * Math.random() << 0]]
}


export {
    clamp,
    float,
    getRandomInt,
    getRandomIntEx,
    getRandomIntInc,
    getPercentDiff,
    getPercentOf,
    getPercentRandomBool,
    getRandomFromArray,
    getRandomFromObject,
    valueBetween,
    getRandomSplitInt
};