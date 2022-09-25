const { Response, generateMongoID, getCurrentTimestamp } = require("../../utilities");
const { Account } = require("../models/Account");

class FriendController {

    static async clientFriendRequestListOutbox(request = null, reply = null) {
        const account = await Account.get(await Response.getSessionID(request));
        if (!account?.friendRequestOutbox){
            account["friendRequestOutbox"] = [];
            account.save();
        }

        return Response.zlibJsonReply(
            reply,
            Response.applyBody(account.friendRequestOutbox)
        )
    }

    static async clientFriendRequestListInbox(request, reply) {
        const account = await Account.get(await Response.getSessionID(request));
        if (!account?.friendRequestInbox){
            account["friendRequestInbox"] = [];
            account.save();
        }

        return Response.zlibJsonReply(
            reply,
            Response.applyBody(account.friendRequestInbox)
        )
    }

    static async clientFriendRequestSend(request, reply) {
        const sentToAccount = await Account.get(request.body.to);
        const sentToProfile = await sentToAccount.getProfile();

        const sentFromSessionId = await Response.getSessionID(request)
        const sentFromAccount = await Account.get(sentFromSessionId)
        const sentFromProfile = await sentFromAccount.getProfile();

        const friendRequestId = await generateMongoID();

        if (!sentToAccount?.friendRequestInbox) sentToAccount["friendRequestInbox"] = [];
        sentToAccount.friendRequestInbox.push(await FriendControllerUtil.createFriendRequest(
            friendRequestId,
            request.body.to,
            sentFromSessionId,
            sentFromProfile
        ));

        if (!sentFromAccount?.friendRequestOutbox) sentFromAccount["friendRequestOutbox"] = [];
        sentFromAccount.friendRequestOutbox.push(await FriendControllerUtil.createFriendRequest(
            friendRequestId,
            sentFromSessionId,
            request.body.to,
            sentToProfile
        ))

        sentToAccount.save();
        sentFromAccount.save();

        return Response.zlibJsonReply(
            reply,
            Response.applyBody({
                requestId: friendRequestId,
                retryAfter: 30,
                status: 0
            })
        )
    }

    static async clientFriendRequestList(request, reply) {
        const account = await Account.get(await Response.getSessionID(request));
        if (account?.friends){ //create friends object if it doesn't exist
            account["friends"] = {};
            account.friends["Friends"] = [];
            account.friends["Ignore"] = [];
            account.friends["InIgnoreList"] = [];

            account.save();
        }

        return Response.zlibJsonReply(
            reply,
            Response.applyBody(account.friends)
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

class FriendControllerUtil {
    static async miniAccountTemplate(profile){
        return ({
            _id: profile.character.aid,
            Info: {
                Level: profile.character.Info.Level,
                Side: profile.character.Info.Side,
                Nickname: profile.character.Info.Nickname,
                MemberCategory: profile.character.Info.MemberCategory,
                Ignored: false,
                Banned: profile.character.Info.BannedState
            }
        })
    }

    /**
     * 
     * @param {string} id 
     * @param {string} to 
     * @param {string} from 
     * @param {obj} profile 
     * @returns {<Promise>obj}
     */
    static async createFriendRequest(id, to, from, profile){
        return ({
           _id: id,
           from: from,
           to: to,
           date: await getCurrentTimestamp(),
           profile: await this.miniAccountTemplate(profile)
        })
    }
}
module.exports.FriendControllerUtil = FriendControllerUtil;
module.exports.FriendController = FriendController;