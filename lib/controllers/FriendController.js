const { FastifyResponse } = require("../../utilities");

class FriendController {

    static async clientFriendRequestListOutbox(request = null, reply = null) {
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody([])
        )
    }

    static async clientFriendRequestListInbox(request = null, reply = null) {
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody([])
        )
    }

    static async clientFriendRequestList(request = null, reply = null) {
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody({ Friends: [], Ignore: [], InIgnoreList: [] })
        )
    }

    static async clientFriendRequest(request = null, reply = null) {
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody({
                requestId: "¯\\_(ツ)_/¯",
                retryAfter: 0,
                status: 0,
            })
        )
    }
}

module.exports.FriendController = FriendController;