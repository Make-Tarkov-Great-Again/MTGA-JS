const { ClientController } = require("../../lib/controllers");
const { FastifyResponse, logger } = require("../../utilities");


module.exports = async function ragfairRoutes(app, _opts) {

    app.post(`/client/mail/dialog/list`, async (request, reply) => {
        logger.logConsole(`[mail/dialog/list] : ${request.body}`);
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(await ClientController.clientMailDialogList(request, reply))
        );
    });
};
