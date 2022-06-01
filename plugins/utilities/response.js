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

module.exports = async function sendCompressedResponse(data, request, reply) {
    reply.compress()
}

/**
 * Handle Bundle
 * @param {*} sessionID 
 * @param {*} req 
 * @param {*} resp 
 * @param {*} body 
 */
const respondBundle = async (sessionID, req, resp, body) => {
    let bundleKey = req.url.split('/bundle/')[1];
    bundleKey = decodeURI(bundleKey);
    logger.logInfo(`[BUNDLE]: ${req.url}`);
    let bundle = bundles_f.handler.getBundleByKey(bundleKey, true);
    let path = bundle.path;
    // send bundle
    server.tarkovSend.file(resp, path);
}
/**
 * Handle Image
 * @param {*} sessionID 
 * @param {*} req 
 * @param {*} resp 
 * @param {*} body 
 */
const respondImage = async (sessionID, req, resp, body) => {
    let splittedUrl = req.url.split('/');
    let fileName = splittedUrl[splittedUrl.length - 1].split('.').slice(0, -1).join('.');
    let baseNode = {};
    let imgCategory = "none";

    // get images to look through
    switch (true) {
        case req.url.includes("/quest"):
            logger.logInfo(`[IMG.quests]: ${req.url}`);
            baseNode = res.quest;
            imgCategory = "quest";
            break;

        case req.url.includes("/handbook"):
            logger.logInfo(`[IMG.handbook]: ${req.url}`);
            baseNode = res.handbook;
            imgCategory = "handbook";
            break;

        case req.url.includes("/avatar"):
            logger.logInfo(`[IMG.avatar]: ${req.url}`);
            baseNode = res.trader;
            imgCategory = "avatar";
            break;

        case req.url.includes("/banners"):
            logger.logInfo(`[IMG.banners]: ${req.url}`);
            baseNode = res.banners;
            imgCategory = "banner";
            break;

        default:
            logger.logInfo(`[IMG.hideout]: ${req.url}`);
            baseNode = res.hideout;
            imgCategory = "hideout";
            break;
    }

    // if file does not exist
    if (!baseNode[fileName]) {
        logger.logError("Image not found! Sending backup image.");
        baseNode[fileName] = "res/noimage/" + imgCategory + ".png";
        server.tarkovSend.file(resp, baseNode[fileName]);
    } else {
        // send image
        server.tarkovSend.file(resp, baseNode[fileName]);
    }
}
/**
 * Handle Notifications
 * @param {*} sessionID 
 * @param {*} req 
 * @param {*} resp 
 * @param {*} data 
 */
const respondNotify = async (sessionID, req, resp, data) => {
    let splittedUrl = req.url.split('/');
    sessionID = splittedUrl[splittedUrl.length - 1].split("?last_id")[0];
    notifier_f.handler.notificationWaitAsync(resp, sessionID);
}

/**
 * Handle Ending Response
 * @returns 
 */
const respondKillResponse = async () => {
    return;
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
    clearString,
    respondBundle,
    respondImage,
    respondNotify,
    respondKillResponse
}