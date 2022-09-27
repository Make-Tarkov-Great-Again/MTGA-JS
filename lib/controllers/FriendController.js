const { Response, generateMongoID, getCurrentTimestamp, logger } = require("../../utilities");
const { Account } = require("../models/Account");

class FriendController {

    static async clientFriendRequestListOutbox(request = null, reply = null) {
        const account = await Account.get(await Response.getSessionID(request));
        if (!account?.friendRequestOutbox) {
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
        if (!account?.friendRequestInbox) {
            account["friendRequestInbox"] = [];
            account.save();
        }

        return Response.zlibJsonReply(
            reply,
            Response.applyBody(account.friendRequestInbox)
        )
    }

    static async clientFriendRequestList(request, reply) {
        const account = await Account.get(await Response.getSessionID(request));
        if (!account?.friends) { //create friends object if it doesn't exist
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

    static async clientFriendRequestSend(request, reply) {
        const sentToAccount = await Account.get(request.body.to);

        const sentFromSessionId = await Response.getSessionID(request)
        const sentFromAccount = await Account.get(sentFromSessionId);


        const requestId = await generateMongoID();
        if (!sentToAccount?.friendRequestInbox) sentToAccount["friendRequestInbox"] = [];
        sentToAccount.friendRequestInbox.push(await FriendControllerUtil.createFriendRequest(
            requestId,
            sentFromSessionId,
            request.body.to,
            await sentFromAccount.getProfile()
        ));

        if (!sentFromAccount?.friendRequestOutbox) sentFromAccount["friendRequestOutbox"] = [];
        sentFromAccount.friendRequestOutbox.push(await FriendControllerUtil.createFriendRequest(
            requestId,
            sentFromSessionId,
            request.body.to,
            await sentToAccount.getProfile()
        ))

        sentToAccount.save();
        sentFromAccount.save();

        return Response.zlibJsonReply(
            reply,
            Response.applyBody({
                requestId: requestId,
                retryAfter: 30,
                status: 0
            })
        )
    }


    static async clientFriendRequestCancel(request, reply) {
        const sentFromAccount = await Account.get(await Response.getSessionID(request));
        const sentFromOutbox = sentFromAccount.friendRequestOutbox;

        for (const outbox in sentFromOutbox) {
            if (sentFromOutbox[outbox]._id !== request.body.requestId) continue;

            const sentToAccount = await Account.get(sentFromOutbox[outbox].to);
            const sentToInbox = sentToAccount.friendRequestInbox;

            for (const inbox in sentToInbox) {
                if (sentToInbox[inbox]._id !== request.body.requestId) continue;

                sentToInbox.splice(inbox, 1);
                await sentToAccount.save();
            }

            sentFromOutbox.splice(outbox, 1);
            await sentFromAccount.save();
        }

        return Response.zlibJsonReply(
            reply,
            Response.applyBody(request.body.requestId)
        );
    }

    static async clientFriendRequestAccept(request, reply) {
        const sentToAccount = await Account.get(await Response.getSessionID(request));
        const sentToInbox = sentToAccount.friendRequestInbox;

        if (!sentToAccount?.friends) { //create friends object if it doesn't exist
            sentToAccount["friends"] = {};
            sentToAccount.friends["Friends"] = [];
            sentToAccount.friends["Ignore"] = [];
            sentToAccount.friends["InIgnoreList"] = [];
        }

        for (const inbox in sentToInbox) {
            if (sentToInbox[inbox]._id !== request.body.request_id) continue;

            const sentFromAccount = await Account.get(sentToInbox[inbox].from);
            const sentFromOutbox = sentFromAccount.friendRequestOutbox;

            if (!sentFromAccount?.friends) { //create friends object if it doesn't exist
                sentFromAccount["friends"] = {};
                sentFromAccount.friends["Friends"] = [];
                sentFromAccount.friends["Ignore"] = [];
                sentFromAccount.friends["InIgnoreList"] = [];
            }

            for (const outbox in sentFromOutbox) {
                if (sentFromOutbox[outbox]._id !== request.body.request_id) continue;

                sentFromAccount.friends.Friends.push(sentFromOutbox[outbox].profile);
                sentFromOutbox.splice(outbox, 1);
                await sentFromAccount.save();
            }

            sentToAccount.friends.Friends.push(sentToInbox[inbox].profile);
            sentToInbox.splice(inbox, 1);
            await sentToAccount.save();
        }

        return Response.zlibJsonReply(
            reply,
            Response.applyBody(request.body.requestId)
        );
    }

    static async clientFriendRequestDecline(request, reply) {
        const sentToAccount = await Account.get(await Response.getSessionID(request));
        const sentToInbox = sentToAccount.friendRequestInbox;

        for (const inbox in sentToInbox) {
            if (sentToInbox[inbox]._id !== request.body.request_id) continue;

            const sentFromAccount = await Account.get(sentToInbox[inbox].from);
            const sentFromOutbox = sentFromAccount.friendRequestOutbox;

            for (const outbox in sentFromOutbox) {
                if (sentFromOutbox[outbox]._id !== request.body.request_id) continue;

                sentFromOutbox.splice(outbox, 1);
                await sentFromAccount.save();
            }

            sentToInbox.splice(inbox, 1);
            await sentToAccount.save();
        }

        return Response.zlibJsonReply(
            reply,
            Response.applyBody(request.body.request_id)
        );
    }

    static async clientFriendDelete(request, reply) {
        logger.info(request.body);
    }

    static async clientFriendIgnoreSet(request, reply) {
        const account = await Account.get(await Response.getSessionID(request));

        account.friends.Ignore.push(request.body.uid);
        account.friends.InIgnoreList.push(request.body.uid);

        await account.save();

        return Response.zlibJsonReply(
            reply,
            Response.applyBody(request.body.uid)
        );

    }

    static async clientFriendIgnoreRemove(request, reply) {
        const account = await Account.get(await Response.getSessionID(request));

        account.friends.Ignore = account.friends.Ignore.filter(id => id !== request.body.uid);
        account.friends.InIgnoreList = account.friends.InIgnoreList.filter(id => id !== request.body.uid);

        await account.save();

        return Response.zlibJsonReply(
            reply,
            Response.applyBody(request.body.uid)
        );
    }

}

class FriendControllerUtil {
    static async miniAccountTemplate(profile) {
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
    static async createFriendRequest(id, from, to, profile) {
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