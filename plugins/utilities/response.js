'use strict'
const { stringify } = require('./fileIO');

// noBody
const noBody = (data) => {
    return clearString(stringify(data));
}
// getBody
const getBody = (data, err = 0, errmsg = null) =>{
    return stringify({ "err": err, "errmsg": errmsg, "data": data }, true);
}
// getUnclearedBody
const getUnclearedBody = (data, err = 0, errmsg = null) =>{
    return stringify({ "err": err, "errmsg": errmsg, "data": data });
}
// nullResponse
const nullResponse = () => {
    return this.getBody(null);
}
// emptyArrayResponse
const emptyArrayResponse = () => {
    return this.getBody([]);
}

// clearString
const clearString = (s) => {
    return s.replace(/[\b]/g, '')
        .replace(/[\f]/g, '')
        .replace(/[\n]/g, '')
        .replace(/[\r]/g, '')
        .replace(/[\t]/g, '')
        .replace(/[\\]/g, '');
}
module.exports = {
    noBody,
    getBody,
    getUnclearedBody,
    nullResponse,
    emptyArrayResponse,
    clearString
}