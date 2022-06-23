'use strict'
const { stringify, createReadStream } = require('./fileIO');

const mime = {
    html: "text/html",
    txt: "text/plain",
    jpg: "image/jpeg",
    png: "image/png",
    css: "text/css",
    otf: "font/opentype",
    json: "application/json",
}

const mimeTypes = {
    "css": "text/css",
    "bin": "application/octet-stream",
    "html": "text/html",
    "jpg": "image/jpeg",
    "js": "text/javascript",
    "json": "application/json",
    "png": "image/png",
    "svg": "image/svg+xml",
    "txt": "text/plain",
    "json": "application/json",
    "zlib": "application/zlib",
}

// 
const parseAcceptHeaders = (acceptHeaders)  => {
    const splitAcceptHeaders = acceptHeaders.split(',');
    switch(true) {
        case splitAcceptHeaders.includes('text/html'):
            return mime['html'];
        break;
        case splitAcceptHeaders.includes('text/css'):
            return mime['css'];
        break;
    }
}

const zlibJsonReply = async (data, reply) => {
    let deflatedData = null;
    let header = { 
        'Content-Type': this.mime["json"] 
    }

    internal.zlib.deflate(data, function (err, buf) {
        deflatedData = buf;
    });

    // in this case we are using only the nodejs http server response object
    reply.raw.writeHead(200, header)
    reply.raw.write('ok')
    reply.raw.end()
}


// noBody
const noBody = (data) => {
    return clearString(stringify(data));
}
// getBody
const getBody = (data, err = 0, errmsg = null) => {
    return stringify({ "err": err, "errmsg": errmsg, "data": data }, true);
}
// getUnclearedBody
const getUnclearedBody = (data, err = 0, errmsg = null) => {
    return stringify({ "err": err, "errmsg": errmsg, "data": data });
}
// nullResponse
const nullResponse = () => {
    return getBody(null);
}
// emptyArrayResponse
const emptyArrayResponse = () => {
    return getBody([]);
}

/**
 * Handle Bundle
 * @param {*} sessionID 
 * @param {*} req 
 * @param {*} reply 
 * @param {*} body 
 */
const respondBundle = async (sessionID, req, reply, body) => {
    let bundleKey = req.url.split('/bundle/')[1];
    bundleKey = decodeURI(bundleKey);
    logger.logInfo(`[BUNDLE]: ${req.url}`);
    const bundle = bundles_f.handler.getBundleByKey(bundleKey, true);
    const path = bundle.path;
    // send bundle
    await file(reply, path);
}
/**
 * Handle Image
 * @param {*} sessionID 
 * @param {*} req 
 * @param {*} resp 
 * @param {*} body 
 */
const respondImage = async (sessionID, req, resp, body) => {
    const splittedUrl = req.url.split('/');
    const fileName = splittedUrl[splittedUrl.length - 1].split('.').slice(0, -1).join('.');
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
        await file(resp, baseNode[fileName]);
    } else {
        // send image
        await file(resp, baseNode[fileName]);
    }
}

const file = async (reply, file) => {
    const _split = file.split(".");
    const type = mime[_split[_split.length - 1]] || mime["txt"];
    const fileStream = createReadStream(file);

    fileStream.on("open", function () {
        reply.header("Content-Type", type);
        fileStream.pipe(reply);
    });
}

const txtJson = async (reply, output) => {
    await reply.header(200, "OK", { "Content-Type": this.mime["json"] }).send(output);
}

const html = async (reply, output) => {
    await reply.header(200, "OK", { "Content-Type": mime["html"] }).send(output);
}

const sendStaticFile = async (req, reply) => {
    if (req.url == "/favicon.ico") {
        await file(reply, "res/icon.ico");
        return true;
    }
    if (req.url.includes(".css")) {
        await file(reply, "res/style.css");
        return true;
    }
    if (req.url.includes("bender.light.otf")) {
        await file(reply, "res/bender.light.otf");
        return true;
    }

    if (req.url.includes("/server/config")) {
        return true;
    }
/*     if (req.url == "/") {
        await html(reply, home_f.RenderHomePage(), "");
        return true;
    } */
    return false;
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
    respondKillResponse,
    txtJson,
    html,
    file,
    parseAcceptHeaders,
    zlibJsonReply
}