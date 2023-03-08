import { FriendController } from "../../controllers/_index.mjs";
import { Response, logger } from "../../utilities/_index.mjs";

export default async function friendRoutes(app, _opts) {

    app.post('/client/game/profile/search', async (request, reply) => {
        await FriendController.clientGameProfileSearch(request, reply);
    });

    app.post(`/client/friend/list`, async (request, reply) => {
        await FriendController.clientFriendRequestList(await Response.getSessionID(request), reply);
    });

    app.post(`/client/friend/request/send`, async (request, reply) => {
        await FriendController.clientFriendRequestSend(request, reply);
    });

    app.post(`/client/friend/request/cancel`, async (request, reply) => {
        await FriendController.clientFriendRequestCancel(request, reply);
    });

    app.post(`/client/friend/request/accept`, async (request, reply) => {
        await FriendController.clientFriendRequestAccept(request, reply);
    });

    app.post(`/client/friend/request/accept-all`, async (request, reply) => {
        await FriendController.clientFriendRequestAccept(request, reply);
    });

    app.post(`/client/friend/request/decline`, async (request, reply) => {
        await FriendController.clientFriendRequestDecline(request, reply);
    });

    app.post(`/client/friend/delete`, async (request, reply) => {
        await FriendController.clientFriendDelete(request, reply);
    });

    app.post(`/client/friend/ignore/set`, async (request, reply) => {
        await FriendController.clientFriendIgnoreSet(request, reply);
    });

    app.post(`/client/friend/ignore/remove`, async (request, reply) => {
        await FriendController.clientFriendIgnoreRemove(request, reply);
    });

    app.post(`/client/friend/request/list/inbox`, async (request, reply) => {
        await FriendController.clientFriendRequestListInbox(await Response.getSessionID(request), reply);
    });

    app.post(`/client/friend/request/list/outbox`, async (request, reply) => {
        await FriendController.clientFriendRequestListOutbox(await Response.getSessionID(request), reply);
    });

    app.post(`/client/reports/lobby/send`, async (request, reply) => {
        logger.warn(`[REPORT: REPLY] We do not care!`);
        return Response.zlibJsonReply(
            reply,
            await Response.applyEmpty("null")
        );
    });
};
