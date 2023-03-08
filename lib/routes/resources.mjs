import { webinterface } from '../../app.mjs';
import { logger, fileExist } from '../utilities/_index.mjs';

import { createWriteStream, createReadStream } from 'fs';
import { promisify } from 'util';
import { pipeline } from 'stream';


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
            logger.warn(`Icon file downloaded to ${properPath}`);
            return properPath;
        } else {
            if (icon.includes("quest")) {
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

    const streamPipeline = promisify(pipeline);
    const response = await fetch(path);
    await streamPipeline(response.body, createWriteStream(directory));
}

export default async function resourcesRoutes(app, opts) {

    app.get(`/files/*`, async (request, reply) => {

        const file = await returnProperIconPath(request);
        const stream = createReadStream(file);

        return stream;
    });

    app.get(`/resources/*`, async (request, reply) => {
        const file = request.params['*'];
        const fileExtension = String(request.params['*'].split(".").at(-1)).toLowerCase();

        switch (fileExtension) {
            case "css":
                reply.type("text/css");
                break;
            case "ico":
                reply.type("image/x-icon");
                return createReadStream(`${webinterface.baseDirectory}/resources/${file}`);
        }
        return webinterface.readFile(file);
    });
}