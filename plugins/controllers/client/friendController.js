const { database } = require("../../../app");
const { FastifyResponse } = require("../../utilities");

class FriendController {

    static clientFriendRequestListOutbox = async (request = null, reply = null) => {
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody([])
        )
    }

    static clientFriendRequestListInbox = async (request = null, reply = null) => {
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody([])
        )
    }

    static clientFriendRequestList = async (request = null, reply = null) => {
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody({ Friends: [], Ignore: [], InIgnoreList: [] })
        )
    }

    static clientFriendRequest = async (request = null, reply = null) => {
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