const { ClientController } = require("../../lib/controllers");

module.exports = async function ragfairRoutes(app, _opts) {

    app.post(`/client/mail/dialog/list`, async (request, reply) => {
        await ClientController.clientMailDialogList(request, reply)
    });

    app.post(`/client/mail/dialog/view`, async (request, reply) => {
        await ClientController.clientMailDialogView(request, reply)
    });

    app.post('/client/mail/dialog/info', async (request, reply) => {
        await ClientController.clientMailDialogInfo(request, reply);
    })

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
};
