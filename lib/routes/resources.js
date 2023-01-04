const { webinterface } = require('../../app');
const { read, logger, fileExist, createDirectory } = require('../utilities');

const fs = require('fs');
const Downloader = require("nodejs-file-downloader");



async function returnProperIconPath(request) {
    const directory = `./assets/database/res`;
    const icon = request.params['*'];

    let properPath;
    if (await fileExist(`${directory}/${icon.replace("jpg", "png")}`))
        properPath = `${directory}/${icon.replace("jpg", "png")}`;
    else
        properPath = `${directory}/${icon.replace("png", "jpg")}`;

    if (await fileExist(properPath))
        return properPath;
    else {
        const _ = await pipeFromURL(request.url);
        
        if (_ === "COMPLETE" && await fileExist(`${directory}/${icon}`)) {
            properPath = `${directory}/${icon}`;
            return properPath;
        } else {
            if (icon.includes("quest")) {
                await logger.info("[ICON] Missing Quest icon");
                properPath = `${directory}/noimage/quest.png`;
                return properPath;
            }
            else if (icon.includes("trader")) {
                await logger.info("[ICON] Missing Trader icon");
                properPath = `${directory}/noimage/avatar.png`;
                return properPath;
            }
            else if (icon.includes("banner")) {
                await logger.info("[ICON] Missing Quest icon");
                properPath = `${directory}/noimage/banner.png`;
                return properPath;
            }
        }
    }
}

async function pipeFromURL(url) {
    const prod = `https://prod.escapefromtarkov.com:replace`;
    const path = prod.replace(":replace", url);

    let directory = `./assets/database/res`;

    if (url.includes("quest")) {
        if (!await fileExist(`${directory}/quest`)) {
            await createDirectory(`${directory}/quest`);
        } else if (!await fileExist(`${directory}/quest/icon`)) {
            await createDirectory(`${directory}/quest/icon`);
        }
    } else if (url.includes("trader")) {
        if (!await fileExist(`${directory}/trader`)) {
            await createDirectory(`${directory}/trader`);
        }
    } else if (url.includes("banner")) {
        if (!await fileExist(`${directory}/banners`)) {
            await createDirectory(`${directory}/banners`);
        }
    }

    directory = url.replace("/files", "./assets/database/res");
    const downloader = new Downloader({
        url: path,
        directory: directory
    });
    try {
        await downloader.download();
        await logger.success("Icon downloaded!");
        return "COMPLETE";
    }
    catch (error) {
        await logger.error("Icon download failed", error);
        return "FAILED"
    }

}

module.exports = async function resourcesRoutes(app, opts) {

    app.get(`/files/*`, async (request, reply) => {

        const file = await returnProperIconPath(request);
        const stream = fs.createReadStream(file);
        //await logger.debug(`[RESOURCES] Reading file: ./assets/database/res/${file}`);

        return stream;
    });

    app.get(`/resources/*`, async (request, reply) => {
        const file = request.params['*'];
        const fileExtension = String(request.params['*'].split(".").at(-1)).toLowerCase();

        switch (fileExtension) {
            case "css":
                reply.type("text/css");
                break;
        }
        //await logger.debug(`[RESOURCES] Reading file: ${webinterface.baseDirectory}/resources/${file}`);
        return webinterface.readFile(file);
    });
}