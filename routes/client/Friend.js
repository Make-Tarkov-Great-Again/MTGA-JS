const { FriendController } = require("../../lib/controllers");
const { logger } = require("../../utilities");

module.exports = async function friendRoutes(app, _opts) {

    app.post(`/client/friend/list`, async (request, reply) => {
        console.log(`[Current Friend List] : ${request.body}`);
        logger.logWarning("Friend List not implemented yet");
        await FriendController.clientFriendRequestList(request, reply);
    });

    app.post(`/client/friend/request/list/inbox`, async (request, reply) => {
        console.log(`[Received Friend Requests] : ${request.body}`);
        logger.logWarning("Inbox is not implemented yet");
        await FriendController.clientFriendRequestListInbox(request, reply);
    });

    app.post(`/client/friend/request/list/outbox`, async (request, reply) => {
        console.log(`[Sent Friend Requests] : ${request.body}`);
        logger.logWarning("Outbox not implemented yet");
        await FriendController.clientFriendRequestListOutbox(request, reply);
    });
};
