import { webinterface } from '../../app.mjs';
import { logger, fileExist, checkInternet } from '../utilities/_index.mjs';

import { createWriteStream, createReadStream } from 'fs';
import { promisify } from 'util';
import { pipeline } from 'stream';

const prod = `https://prod.escapefromtarkov.com:replace`;



async function returnProperIconPath(request) {
    const directory = `./assets/database/res`;
    const icon = request.params['*'];
    const pathJpg = `${directory}/${icon.replace('png', 'jpg')}`;
    const pathPng = `${directory}/${icon.replace('jpg', 'png')}`;

    let properPath = await fileExist(pathPng)
        ? pathPng
        : await fileExist(pathJpg)
            ? pathJpg
            : null;

    if (properPath !== null) {
        return properPath;
    }

    if (!await checkInternet())
        logger.warn("No Internet Connection available - Icon File not downloaded!")
    else
        await pipeFromURL(request.url);

    if (await fileExist(`${directory}/${icon}`)) {
        properPath = `${directory}/${icon}`;
        logger.info(`Icon file downloaded to ${properPath}`);
        return properPath;
    }

    if (icon.includes("quest")) {
        logger.warn(`[ICON] Missing Quest icon [${icon}]`);
        return `${directory}/noimage/quest.png`;
    }
    if (icon.includes("trader")) {
        logger.warn(`[ICON] Missing Trader icon [${icon}]`);
        return `${directory}/noimage/avatar.png`;
    }
    if (icon.includes("banner")) {
        logger.warn(`[ICON] Missing Quest icon [${icon}]`);
        return `${directory}/noimage/banner.png`;
    }
    if (icon.includes("Hideout")) {
        logger.warn(`[ICON] Missing Hideout icon [${icon}]`);
        return `${directory}/noimage/hideout.png`;
    }
    if (icon.includes("handbook")) {
        logger.warn(`[ICON] Missing Handbook icon [${icon}]`);
        return `${directory}/noimage/handbook.png`;
    }
}

async function pipeFromURL(url) {
    try {
        const path = prod.replace(':replace', url);
        const directory = url.replace('/files', './assets/database/res');
        const streamPipe = promisify(pipeline);
        const response = await fetch(path);
        streamPipe(response.body, createWriteStream(directory));
    } catch (err) {
        console.error(`Error piping from ${url}: ${err}`);
    }
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