const { Profile } = require("../../lib/models/Profile");
const { FriendController, FriendControllerUtil } = require("../../lib/controllers");
const { Response, generateMongoID, logger } = require("../../utilities");

module.exports = async function friendRoutes(app, _opts) {

    app.post('/client/game/profile/search', async (request, reply) => { //technically should be friend route
        const output = []

        const profiles = await Profile.getAllWithoutKeys();
        if (profiles.length > 0) {
            for (const profile of profiles) {
                if (profile?.character?.Info?.Nickname === request.body.nickname) {
                    output.push(await FriendControllerUtil.miniAccountTemplate(profile))
                }
            }
        }

        return Response.zlibJsonReply(
            reply,
            Response.applyBody(output)
        );
    });

    app.post(`/client/friend/list`, async (request, reply) => {
        await FriendController.clientFriendRequestList(request, reply);
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
        await FriendController.clientFriendRequestAcceptAll(request, reply);
    });

    app.post(`/client/friend/request/decline`, async (request, reply) => {
        await FriendController.clientFriendRequestDecline(request, reply);
    });

    app.post(`/client/friend/request/list/inbox`, async (request, reply) => {
        await FriendController.clientFriendRequestListInbox(request, reply);
    });

    app.post(`/client/friend/request/list/outbox`, async (request, reply) => {
        await FriendController.clientFriendRequestListOutbox(request, reply);
    });
};
