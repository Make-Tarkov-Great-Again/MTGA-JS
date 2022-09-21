const { Response } = require("../../utilities");

class FriendController {

    static async clientFriendRequestListOutbox(request = null, reply = null) {
        return Response.zlibJsonReply(
            reply,
            Response.applyBody([])
        )
    }

    static async clientFriendRequestListInbox(request = null, reply = null) {
        return Response.zlibJsonReply(
            reply,
            Response.applyBody([])
        )
    }

    static async clientFriendRequestList(request = null, reply = null) {
        return Response.zlibJsonReply(
            reply,
            Response.applyBody({ Friends: [], Ignore: [], InIgnoreList: [] })
        )
    }

    static async clientFriendRequest(request = null, reply = null) {
        return Response.zlibJsonReply(
            reply,
            Response.applyBody({
                requestId: "¯\\_(ツ)_/¯",
                retryAfter: 0,
                status: 0,
            })
        )
    }
}

module.exports.FriendController = FriendController;