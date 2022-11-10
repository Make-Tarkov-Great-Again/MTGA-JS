const { webinterface } = require('../../app');
const { read, logger, fileExist } = require('../utilities');


async function returnProperIconPath(request) {
    const file = await fileExist(`./assets/database/res/${request.params['*'].replace("jpg", "png")}`)
        ? request.params['*'].replace("jpg", "png")
        : request.params['*'].replace("png", "jpg");

    if (await fileExist(`./assets/database/res/${file}`))
        return file;
    else {
        if (file.includes("quest"))
            return `/noimage/quest.png`;
        else if (file.includes("trader"))
            return `/noimage/avatar.png`;
        else if (file.includes("banner"))
            return `/noimage/banner.png`;
    }
}

module.exports = async function resourcesRoutes(app, opts) {
    const fs = require('fs');

    app.get(`/files/*`, async (request, reply) => {

        const file = await returnProperIconPath(request);
        const stream = fs.createReadStream(`./assets/database/res/${file}`);
        //logger.debug(`[RESOURCES] Reading file: ./assets/database/res/${file}`);

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