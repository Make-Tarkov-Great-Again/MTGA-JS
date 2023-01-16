const { webinterface } = require('../../app');
const { read, logger, fileExist, createDirectory } = require('../utilities');

const fs = require('fs');
const util = require('util');
const { pipeline } = require('stream');



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
        await pipeFromURL(request.url); // download if available

        if (await fileExist(`${directory}/${icon}`)) {
            properPath = `${directory}/${icon}`;
            logger.info(`Icon file downloaded to ${properPath}`);
            return properPath;
        } else {
            if (icon.includes("quest")) {
                const id = icon.split(`quest/icon`);
                logger.info(`[ICON] Missing Quest icon [${icon}]`);
                properPath = `${directory}/noimage/quest.png`;
                return properPath;
            }
            else if (icon.includes("trader")) {
                logger.info(`[ICON] Missing Trader icon [${icon}]`);
                properPath = `${directory}/noimage/avatar.png`;
                return properPath;
            }
            else if (icon.includes("banner")) {
                logger.info(`[ICON] Missing Quest icon [${icon}]`);
                properPath = `${directory}/noimage/banner.png`;
                return properPath;
            }
            else if (icon.includes("Hideout")) {
                logger.info(`[ICON] Missing Hideout icon [${icon}]`);
                properPath = `${directory}/noimage/hideout.png`;
                return properPath;
            }
            else if (icon.includes("handbook")) {
                logger.info(`[ICON] Missing Handbook icon [${icon}]`);
                properPath = `${directory}/noimage/handbook.png`;
                return properPath;
            }
        }
    }
}

async function pipeFromURL(url) {
    const prod = `https://prod.escapefromtarkov.com:replace`;

    const path = prod.replace(":replace", url);
    const directory = url.replace("/files", "./assets/database/res");

    const streamPipeline = util.promisify(pipeline);
    const response = await fetch(path);
    await streamPipeline(response.body, fs.createWriteStream(directory));
}

module.exports = async function resourcesRoutes(app, opts) {

    app.get(`/files/*`, async (request, reply) => {

        const file = await returnProperIconPath(request);
        const stream = fs.createReadStream(file);

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
        //logger.debug(`[RESOURCES] Reading file: ${webinterface.baseDirectory}/resources/${file}`);
        return webinterface.readFile(file);
    });
}