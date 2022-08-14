

/** Clamp value between min and max
 * @param {number} value (number)
 * @param {number} min (number)
 * @param {number} max (number)
 * @returns (number) Clamped value
 */
const clamp = (value, min, max) => {
    return Math.min(Math.max(value, min), max);
}

const getRandomInt = async (min = 0, max = 100) => {
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
 * @returns boolean
 */
const getPercentRandomBool = async (percentage) => {
    return ~~((Math.random() * 100) < percentage);
}

/** extension for getRandomInt(1, max)
 * @param {number} max 
 * @returns number
 */
const getRandomIntEx = (max) => {
    return this.getRandomInt(1, max);
}

/**
 * @param {number} min 
 * @param {number} max 
 * @returns 
 */
const getRandomIntInc = (min, max) => {
    min = ~~(min);
    max = ~~(max);
    return ~~(Math.random() * (max - min + 1) + min);
}

const valueBetween = (value, minInput, maxInput, minOutput, maxOutput) => {
    return (maxOutput - minOutput) * ((value - minInput) / (maxInput - minInput)) + minOutput
}

/**
 * @param {any[]} array 
 * @returns rolled value
 */
const getRandomFromArray = async (array) => {
    return array[await getRandomInt(0, array.length - 1)];
}
module.exports = {
    clamp,
    getRandomInt,
    getRandomIntEx,
    getRandomIntInc,
    getPercentDiff,
    getPercentOf,
    getPercentRandomBool,
    getRandomFromArray,
    valueBetween
};