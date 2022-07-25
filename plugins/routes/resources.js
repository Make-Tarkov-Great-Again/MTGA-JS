const { webinterface } = require('../../app');
const { read, logger, fileExist } = require('../utilities');

module.exports = async function resourcesRoutes(app, opts) {
    app.get(`/files/*`, async (request, reply) => {
        let file = request.params['*'].replace("jpg", "png");
        if (fileExist(file) === false) file = request.params['*'].replace("png", "jpg");
        if (fileExist(file) === false) {
            file = `/noimage/quest.png`;
        }

        const fs = require('fs');
        const stream = fs.createReadStream("./database/res/" + file);

        logger.logDebug("[RESOURCES] Reading file: /database/res/" + file);

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

        logger.logDebug("[RESOURCES] Reading file: " + webinterface.baseDirectory + "/resources/" + file);

        return webinterface.readFile(file);
    });
}