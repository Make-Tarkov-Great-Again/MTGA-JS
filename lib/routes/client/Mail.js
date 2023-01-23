const { ClientController } = require("../../controllers");
const { logger, Response, stringify } = require("../../utilities");

module.exports = async function ragfairRoutes(app, _opts) {

    app.post(`/client/mail/dialog/list`, async (request, reply) => {
        await ClientController.clientMailDialogList(await Response.getSessionID(request), reply);
    });

    app.post(`/client/mail/dialog/view`, async (request, reply) => {
        await ClientController.clientMailDialogView(request, reply);
    });

    app.post('/client/mail/dialog/info', async (request, reply) => {
        await ClientController.clientMailDialogInfo(request, reply);
    });

    app.post(`/client/mail/dialog/remove`, async (request, reply) => {
        await ClientController.clientMailDialogRemove(request, reply);
    });

    app.post(`/client/mail/dialog/pin`, async (request, reply) => {
        await ClientController.clientMailDialogPin(request, reply);
    });

    app.post(`/client/mail/dialog/unpin`, async (request, reply) => {
        await ClientController.clientMailDialogUnpin(request, reply);
    });

    app.post(`/client/mail/dialog/read`, async (request, reply) => {
        await ClientController.clientMailDialogRead(request, reply);
    });

    app.post(`/client/mail/dialog/getAllAttachments`, async (request, reply) => {
        await ClientController.clientMailDialogGetAllAttachments(request, reply);
    });

    app.post(`/client/mail/dialog/group/users/add`, async (request, _reply) => {
        logger.warn(stringify(request.body));
    });

    app.post(`/client/mail/dialog/group/users/remove`, async (request, _reply) => {
        logger.warn(stringify(request.body));
    });

    app.post(`/client/mail/dialog/group/leave`, async (request, _reply) => {
        logger.warn(stringify(request.body));
    });

    app.post(`/client/mail/dialog/group/owner/change`, async (request, _reply) => {
        logger.warn(stringify(request.body));
    });

    app.post(`/client/mail/dialog/group/create`, async (request, _reply) => {
        logger.warn(stringify(request.body));
    });

    app.post(`/client/mail/msg/send`, async (request, reply) => {
        const sessionID = await Response.getSessionID(request);
        if (request.body.dialogId === sessionID) {
            if (request.body.type === 1) await ClientController.clientMailMessageReply(request, reply);
            if (request.body.type === 6) logger.warn(`[GROUP CHAT] not implemented`);
        }
        else await ClientController.clientMailMessageSend(request, reply);
    });

    app.post(`/client/mail/dialog/clear`, async (request, _reply) => {
        logger.warn(stringify(request.body));
    });
};
