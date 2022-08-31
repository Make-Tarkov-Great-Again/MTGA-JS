const { FriendController } = require("../../lib/controllers");
const { logger } = require("../../utilities");

module.exports = async function friendRoutes(app, _opts) {

    app.post(`/client/friend/list`, async (request, reply) => {
        logger.warn(`[Current Friend List (NOT IMPLEMENTED)] : ${request.body}`);
        await FriendController.clientFriendRequestList(request, reply);
    });

    app.post(`/client/friend/request/list/inbox`, async (request, reply) => {
        logger.warn(`[Received Friend Requests (NOT IMPLEMENTED)] : ${request.body}`);
        await FriendController.clientFriendRequestListInbox(request, reply);
    });

    app.post(`/client/friend/request/list/outbox`, async (request, reply) => {
        logger.warn(`[Sent Friend Requests (NOT IMPLEMENTED)] : ${request.body}`);
        await FriendController.clientFriendRequestListOutbox(request, reply);
    });
};
