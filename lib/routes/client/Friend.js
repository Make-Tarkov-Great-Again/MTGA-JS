const { Profile } = require("../../models/Profile");
const { FriendController, FriendControllerUtil } = require("../../controllers");
const { Response, logger } = require("../../utilities");

module.exports = async function friendRoutes(app, _opts) {

    app.post('/client/game/profile/search', async (request, reply) => { //technically should be friend route
        const output = []

        const profiles = await Profile.getAllWithoutKeys();
        const sessionId = await Response.getSessionID(request)
        if (profiles.length > 0) {
            for (const profile of profiles) {
                if (profile?.character?.aid === sessionId) continue;
                if (profile?.character?.Info?.Nickname === request.body.nickname) {
                    output.push(await FriendControllerUtil.miniAccountTemplate(profile))
                }
            }
        }

        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(output)
        );
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
        await logger.info(`[REPORT: REPLY] We do not care!`)
        return Response.zlibJsonReply(
            reply,
            await Response.applyEmpty("null")
        );
    });
};
