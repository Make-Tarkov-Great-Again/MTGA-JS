const { webinterface } = require('../app');
const { read, logger, fileExist } = require('../utilities');


async function returnProperIconPath(request) {
    let file = request.params['*'].replace("jpg", "png");
    if (!fileExist("./database/res/" + file)) file = request.params['*'].replace("png", "jpg");
    if (!fileExist("./database/res/" + file)) {

        if (file.includes("quest")) return `/noimage/quest.png`;
        else if (file.includes("trader")) return `/noimage/avatar.png`;
        else if (file.includes("banner")) return `/noimage/banner.png`;

    }
    return file;
}

module.exports = async function resourcesRoutes(app, opts) {
    app.get(`/files/*`, async (request, reply) => {

        const file = await returnProperIconPath(request);
        const fs = require('fs');
        const stream = fs.createReadStream("./database/res/" + file);

        logger.debug("[RESOURCES] Reading file: /database/res/" + file);

        return stream;
    });

    app.get(`/resources/*`, async (request, reply) => {
        const file = request.params['*'];
        let fileExtension = String(file.split(".").at(-1)).toLowerCase();

        switch (fileExtension) {
            case "css":
                reply.type("text/css");
                break;
        }

        logger.debug("[RESOURCES] Reading file: " + webinterface.baseDirectory + "/resources/" + file);

        return webinterface.readFile(file);
    });
}