const { Response, generateMongoID, getCurrentTimestamp, logger } = require("../utilities");
const { Account } = require("../models/Account");

class FriendController {

    static async clientFriendRequestListOutbox(sessionID, reply = null) {
        const account = await Account.get(sessionID);
        if (!account?.friendRequestOutbox) {
            account["friendRequestOutbox"] = [];
            account.save();
        }

        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(account.friendRequestOutbox)
        )
    }

    static async clientFriendRequestListInbox(sessionID, reply) {
        const account = await Account.get(sessionID);
        if (!account?.friendRequestInbox) {
            account["friendRequestInbox"] = [];
            account.save();
        }

        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(account.friendRequestInbox)
        )
    }

    static async clientFriendRequestList(sessionID, reply) {
        const account = await Account.get(sessionID);
        if (!account?.friends) { //create friends object if it doesn't exist
            account["friends"] = {};
            account.friends["Friends"] = [];
            account.friends["Ignore"] = [];
            account.friends["InIgnoreList"] = [];

            account.save();
        }

        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(account.friends)
        )
    }

    static async clientFriendRequestSend(request, reply) {
        const theirAccount = await Account.get(request.body.to);

        const yourSessionID = await Response.getSessionID(request)
        const yourAccount = await Account.get(yourSessionID);


        const requestId = await generateMongoID();
        if (!theirAccount?.friendRequestInbox) theirAccount["friendRequestInbox"] = [];
        theirAccount.friendRequestInbox.push(await FriendControllerUtil.createFriendRequest(
            requestId,
            yourSessionID,
            request.body.to,
            await yourAccount.getProfile()
        ));

        if (!yourAccount?.friendRequestOutbox) yourAccount["friendRequestOutbox"] = [];
        yourAccount.friendRequestOutbox.push(await FriendControllerUtil.createFriendRequest(
            requestId,
            yourSessionID,
            request.body.to,
            await theirAccount.getProfile()
        ))

        theirAccount.save();
        yourAccount.save();

        return Response.zlibJsonReply(
            reply,
            await Response.applyBody({
                requestId: requestId,
                retryAfter: 30,
                status: 0
            })
        )
    }


    static async clientFriendRequestCancel(request, reply) {
        const yourAccount = await Account.get(await Response.getSessionID(request));
        const yourOutbox = yourAccount.friendRequestOutbox;

        for (const outbox in yourOutbox) {
            if (yourOutbox[outbox]._id !== request.body.requestId) continue;

            const theirAccount = await Account.get(yourOutbox[outbox].to);
            const theirInbox = theirAccount.friendRequestInbox;

            for (const inbox in theirInbox) {
                if (theirInbox[inbox]._id !== request.body.requestId) continue;

                theirInbox.splice(inbox, 1);
                await theirAccount.save();
            }

            yourOutbox.splice(outbox, 1);
            await yourAccount.save();
        }

        return Response.zlibJsonReply(
            reply,
            request.body.requestId
        );
    }

    static async clientFriendRequestAccept(request, reply) {
        const yourAccount = await Account.get(await Response.getSessionID(request));
        const yourInbox = yourAccount.friendRequestInbox;

        if (!yourAccount?.friends) { //create friends object if it doesn't exist
            yourAccount["friends"] = {};
            yourAccount.friends["Friends"] = [];
            yourAccount.friends["Ignore"] = [];
            yourAccount.friends["InIgnoreList"] = [];
        }

        for (const inbox in yourInbox) {
            if (yourInbox[inbox]._id !== request.body.request_id) continue;

            const theirAccount = await Account.get(yourInbox[inbox].from);
            const theirOutbox = theirAccount.friendRequestOutbox;

            if (!theirAccount?.friends) { //create friends object if it doesn't exist
                theirAccount["friends"] = {};
                theirAccount.friends["Friends"] = [];
                theirAccount.friends["Ignore"] = [];
                theirAccount.friends["InIgnoreList"] = [];
            }

            for (const outbox in theirOutbox) {
                if (theirOutbox[outbox]._id !== request.body.request_id) continue;

                theirAccount.friends.Friends.push(theirOutbox[outbox].profile);
                theirOutbox.splice(outbox, 1);
                await theirAccount.save();
            }

            yourAccount.friends.Friends.push(yourInbox[inbox].profile);
            yourInbox.splice(inbox, 1);
            await yourAccount.save();
        }

        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(true)
        );
    }

    static async clientFriendRequestDecline(request, reply) {
        const yourAccount = await Account.get(await Response.getSessionID(request));
        const yourInbox = yourAccount.friendRequestInbox;

        for (const inbox in yourInbox) {
            if (yourInbox[inbox]._id !== request.body.request_id) continue;

            const theirAccount = await Account.get(yourInbox[inbox].from);
            const theirOutbox = theirAccount.friendRequestOutbox;

            for (const outbox in theirOutbox) {
                if (theirOutbox[outbox]._id !== request.body.request_id) continue;

                theirOutbox.splice(outbox, 1);
                await theirAccount.save();
            }

            yourInbox.splice(inbox, 1);
            await yourAccount.save();
        }

        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(false)
        );
    }

    static async clientFriendDelete(request, reply) {
        const yourAccount = await Account.get(await Response.getSessionID(request));
        const yourFriends = yourAccount.friends.Friends;

        for (const friend in yourFriends) {
            if (yourFriends[friend]._id === request.body.friend_id) {
                yourFriends.splice(friend, 1);

                const theirAccount = await Account.get(request.body.friend_id);
                const theirFriends = theirAccount.friends.Friends;
                for (const friend in theirFriends) {
                    if (theirFriends[friend]._id === yourAccount.id) {
                        theirFriends.splice(friend, 1);
                    }
                }
            }
        }

        return Response.zlibJsonReply(
            reply,
            await Response.applyEmpty("array")
        );
    }

    static async clientFriendIgnoreSet(request, reply) {
        const yourAccount = await Account.get(await Response.getSessionID(request));
        const theirAccount = await Account.get(request.body.uid);

        yourAccount.friends.Ignore.push(request.body.uid);
        for (const friend in yourAccount.friends.Friends) {
            if (yourAccount.friends.Friends[friend]._id === request.body.uid) {
                yourAccount.friends.Friends[friend].Ignored = true;
            }
        }

        theirAccount.friends.InIgnoreList.push(yourAccount.id);

        await yourAccount.save();
        await theirAccount.save();

        return Response.zlibJsonReply(
            reply,
            await Response.applyEmpty("array")
        );

    }

    static async clientFriendIgnoreRemove(request, reply) {
        const yourAccount = await Account.get(await Response.getSessionID(request));
        const theirAccount = await Account.get(request.body.uid);

        yourAccount.friends.Ignore = yourAccount.friends.Ignore.filter(id => id !== request.body.uid);
        for (const friend in yourAccount.friends.Friends) {
            if (yourAccount.friends.Friends[friend]._id === request.body.uid) {
                yourAccount.friends.Friends[friend].Ignored = false;
            }
        }

        theirAccount.friends.InIgnoreList = theirAccount.friends.InIgnoreList.filter(id => id !== yourAccount.id);

        await yourAccount.save();
        await theirAccount.save();

        return Response.zlibJsonReply(
            reply,
            await Response.applyEmpty("array")
        );
    }

}

class FriendControllerUtil {
    static async miniAccountTemplate(profile) {
        return ({
            _id: profile.character.aid,
            Info: {
                Nickname: profile.character.Info.Nickname,
                Side: profile.character.Info.Side,
                Level: profile.character.Info.Level,
                MemberCategory: profile.character.Info.MemberCategory
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