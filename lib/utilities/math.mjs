
/** Clamp value between min and max
 * @param {number} value (number)
 * @param {number} a (number) min
 * @param {number} b (number) max
 * @returns (number) Clamped value
 */
const clamp = (value, a, b) => {
    return min(max(value, a), b);
}
const abs = (value) => {
    return (value ^ (value >> 31)) - (value >> 31);
}

const min = (a, b) => {
    return (a < b) ? a : b;
}
const max = (a, b) => {
    return (a > b) ? a : b;
}

const round = (number) => {
    return number + (number < 0 ? -0.5 : 0.5) >> 0;
}

const floor = (number) => {
    return number + (number < 0 ? -1 : 0) >> 0;
}

const ceil = (number) => {
    return number + (number < 0 ? 0 : 1) >> 0;
}

const getRandomInt = (min = 0, max = 100) => {
    min = ~~(min);
    max = ~~(max);
    return (max > min) ? ~~(Math.random() * (max - min + 1) + min) : min;
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
 * @returns 
 */
const getRandomIntInc = (min, max) => {
    min = round(min);
    max = round(max);
    return round(Math.random() * (max - min + 1) + min);
}

/**
 * Create random amount of numbers that equal total
 * @param {int} total 
 * @returns {<Promise> arr}
 */
const getRandomSplitInt = (total) => {
    const output = [];
    while (total > 0) {
        const sum = round(Math.random() * (total - 1)) + 1;
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
    min,
    max,
    abs,
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