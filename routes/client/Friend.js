const { FriendController } = require("../../lib/controllers");
const { logger } = require("../../utilities");

module.exports = async function friendRoutes(app, _opts) {

    app.post(`/client/friend/list`, async (request, reply) => {
        logger.logConsole(`[Current Friend List (NOT IMPLEMENTED)] : ${request.body}`);
        await FriendController.clientFriendRequestList(request, reply);
    });

    app.post(`/client/friend/request/list/inbox`, async (request, reply) => {
        logger.logConsole(`[Received Friend Requests (NOT IMPLEMENTED)] : ${request.body}`);
        await FriendController.clientFriendRequestListInbox(request, reply);
    });

    app.post(`/client/friend/request/list/outbox`, async (request, reply) => {
        logger.logConsole(`[Sent Friend Requests (NOT IMPLEMENTED)] : ${request.body}`);
        await FriendController.clientFriendRequestListOutbox(request, reply);
    });
};
