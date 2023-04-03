
/** Clamp value between min and max
 * @param {number} value (number)
 * @param {number} a (number) min
 * @param {number} b (number) max
 * @returns (number) Clamped value
 */
const clamp = (value, a, b) => {
    return Math.min(Math.max(value, a), b);
}

const round = (number) => {
    return Math.round(number);
}

const floor = (number) => {
    return Math.floor(number);
}

const ceil = (number) => {
    return Math.ceil(number);
}

const getRandomInt = (min = 0, max = 100) => {
    min = ~~(min);
    max = ~~(max);
    return (max > min) ? Math.floor(Math.random() * (max - min + 1) + min) : min;
}

/** Used to get percentage between two numbers
 * @param {number} num1 first number input
 * @param {number} num2 second number input
*/
const getPercentDiff = (num1, num2) => {
    return (num1 / num2) * 100;
}

/** Used to get percentage difference between two numbers
 * @param {number} num1 first number input (percentage)
 * @param {number} num2 second number input (value to get percentage of)
 */
const getPercentOf = (num1, num2) => {
    return (num1 / 100) * num2;
}

/** true if lucky, false if unlucky
 * @param {number} percentage 
 * @returns bool
 */
const getPercentRandomBool = (percentage) => {
    return (~~(Math.random() * 100) < percentage);
}

/**
 * Decimal adjustment of a number.
 *
 * @param {String}  type  The type of adjustment - round, floor, ceil
 * @param {Number}  value The number.
 * @param {Integer} exp   The exponent (the 10 logarithm of the adjustment base).
 * @returns {Number}      The adjusted value.
 */
const decimalAdjust = async (type, value, exp = -1) => {
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
    return Math.round(Math.random() * (Math.round(max) - Math.round(min) + 1) + Math.round(min));
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

const valueBetween = (value, minInput, maxInput, minOutput, maxOutput) => {
    return (maxOutput - minOutput) * ((value - minInput) / (maxInput - minInput)) + minOutput
}

const getRandomFromArray = (array) => {
    return array[getRandomInt(0, array.length - 1)];
}

const getRandomFromObject = (obj) => {
    const keys = Object.keys(obj);
    return obj[keys[keys.length * Math.random() << 0]]
}


export {
    clamp,
    round,
    floor,
    ceil,
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