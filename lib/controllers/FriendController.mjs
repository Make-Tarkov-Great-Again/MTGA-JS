import { Response, generateMongoID, getCurrentTimestamp, logger } from "../utilities/_index.mjs";
import { Account, Profile, Dialogues, Character } from "../classes/_index.mjs";

export class FriendController {

    static async clientGameProfileSearch(request, reply) { //technically should be friend route
        const output = []

        const profiles = Profile.getAll();
        if (profiles.length <= 1) {
            logger.warn(`[PROFILE SEARCH] You are alone in this world....`);
            return Response.zlibJsonReply(
                reply,
                await Response.applyBody(output)
            );
        }

        const sessionID = await Response.getSessionID(request);
        for (const id in profiles) {
            if (id === sessionID) {
                logger.warn(`[PROFILE SEARCH] This character is you!`);
                continue;
            }
            if (!profiles[id]?.character) {
                logger.warn(`[PROFILE SEARCH] This character doesn't exist yet!`);
                continue;
            }

            const { character } = profiles[id];
            if (character?.Info.Nickname === request.body.nickname) {
                const template = FriendControllerUtil.miniAccountTemplate(character);
                output.push(template);
            }
        }

        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(output)
        );
    }

    static async clientMailMessageSend(request, reply) {
        const yourProfile = Character.get(await Response.getSessionID(request));
        const theirProfile = Character.get(request.body.dialogId);

        const yourDialog = await Dialogues.createPlayerDialogue(request.body.dialogId, yourProfile.aid);
        const theirDialog = await Dialogues.createPlayerDialogue(yourProfile.aid, request.body.dialogId);

        const yourMessage = await Dialogues.playerMessageForMessageSend(request.body.text, yourProfile.aid);
        yourDialog.messages.push(yourMessage);
        theirDialog.messages.push(yourMessage);

        const yourMini = FriendControllerUtil.miniAccountTemplate(yourProfile);
        const theirMini = FriendControllerUtil.miniAccountTemplate(theirProfile);
        yourDialog.Users.push(yourMini, theirMini);
        theirDialog.Users.push(theirMini, yourMini);

        await Promise.allSettled([
            await Dialogues.save(yourProfile.aid),
            await Dialogues.save(theirProfile.aid)
        ])


        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(yourMessage._id)
        );
    }

    static async clientFriendRequestListOutbox(sessionID, reply = null) {
        const account = Account.getWithSessionId(sessionID);
        if (!account?.friendRequestOutbox) {
            account["friendRequestOutbox"] = [];
            await Account.save(sessionID);
        }

        return Response.zlibJsonReply(
            reply,
            { err: 0, data: account.friendRequestOutbox }
        )
    }

    static async clientFriendRequestListInbox(sessionID, reply) {
        const account = Account.getWithSessionId(sessionID);
        if (!account?.friendRequestInbox) {
            account["friendRequestInbox"] = [];
            await Account.save(sessionID);
        }

        return Response.zlibJsonReply(
            reply,
            { err: 0, data: account.friendRequestInbox }
        )
    }

    static async clientFriendRequestList(sessionID, reply) {
        const account = Account.getWithSessionId(sessionID);
        if (!account?.friends) { //create friends object if it doesn't exist
            account["friends"] = {};
            account.friends["Friends"] = [];
            account.friends["Ignore"] = [];
            account.friends["InIgnoreList"] = [];

            await Account.save(sessionID);
        }


        return Response.zlibJsonReply(
            reply,
            { err: 0, data: account.friends }
        )
    }

    static async clientFriendRequestSend(request, reply) {
        const theirAccount = Account.getWithSessionId(request.body.to);

        const yourSessionID = await Response.getSessionID(request)
        const yourAccount = Account.getWithSessionId(yourSessionID);


        const requestId = generateMongoID();
        if (!theirAccount?.friendRequestInbox)
            theirAccount["friendRequestInbox"] = [];

        const messageFrom = FriendControllerUtil.createFriendRequest(
            requestId,
            yourSessionID,
            request.body.to,
            await yourAccount.getWithSessionIdProfile()
        );
        theirAccount.friendRequestInbox.push(messageFrom);

        if (!yourAccount?.friendRequestOutbox)
            yourAccount["friendRequestOutbox"] = [];

        const messageTo = FriendControllerUtil.createFriendRequest(
            requestId,
            yourSessionID,
            request.body.to,
            await theirAccount.getWithSessionIdProfile()
        );
        yourAccount.friendRequestOutbox.push(messageTo)

        await Account.save(request.body.to);
        await Account.save(yourSessionID);

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
        const yourSessionID = await Response.getSessionID(request);
        const yourAccount = Account.getWithSessionId(yourSessionID);
        const yourOutbox = yourAccount.friendRequestOutbox;

        for (const outbox in yourOutbox) {
            if (yourOutbox[outbox]._id !== request.body.requestId)
                continue;

            const theirAccount = Account.getWithSessionId(yourOutbox[outbox].to);
            const theirInbox = theirAccount.friendRequestInbox;

            for (const inbox in theirInbox) {
                if (theirInbox[inbox]._id !== request.body.requestId)
                    continue;

                theirInbox.splice(inbox, 1);
                await Account.save(yourOutbox[outbox].to);
            }

            yourOutbox.splice(outbox, 1);
            await Account.save(yourSessionID);
        }

        return Response.zlibJsonReply(
            reply,
            request.body.requestId
        );
    }

    static async clientFriendRequestAccept(request, reply) {
        const yourSessionID = await Response.getSessionID(request);
        const yourAccount = Account.getWithSessionId(yourSessionID);
        const yourInbox = yourAccount.friendRequestInbox;

        if (!yourAccount?.friends) { //create friends object if it doesn't exist
            yourAccount["friends"] = {};
            yourAccount.friends["Friends"] = [];
            yourAccount.friends["Ignore"] = [];
            yourAccount.friends["InIgnoreList"] = [];
        }

        for (const inbox in yourInbox) {
            if (yourInbox[inbox]._id !== request.body.request_id)
                continue;

            const theirAccount = Account.getWithSessionId(yourInbox[inbox].from);
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
                await Account.save(yourInbox[inbox].from);
            }

            yourAccount.friends.Friends.push(yourInbox[inbox].profile);
            yourInbox.splice(inbox, 1);
            await Account.save(yourSessionID);
        }

        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(true)
        );
    }

    static async clientFriendRequestDecline(request, reply) {
        const yourSessionID = await Response.getSessionID(request);
        const yourAccount = Account.getWithSessionId(yourSessionID);
        const yourInbox = yourAccount.friendRequestInbox;

        for (const inbox in yourInbox) {
            if (yourInbox[inbox]._id !== request.body.request_id) continue;

            const theirAccount = Account.getWithSessionId(yourInbox[inbox].from);
            const theirOutbox = theirAccount.friendRequestOutbox;

            for (const outbox in theirOutbox) {
                if (theirOutbox[outbox]._id !== request.body.request_id) continue;

                theirOutbox.splice(outbox, 1);
                await Account.save(yourInbox[inbox].from);
            }

            yourInbox.splice(inbox, 1);
            await Account.save(yourSessionID);
        }

        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(false)
        );
    }

    static async clientFriendDelete(request, reply) {
        const yourSessionID = await Response.getSessionID(request);
        const yourAccount = Account.getWithSessionId(yourSessionID);
        const yourFriends = yourAccount.friends.Friends;

        for (const friend in yourFriends) {
            if (yourFriends[friend]._id === request.body.friend_id) {
                yourFriends.splice(friend, 1);

                const theirAccount = Account.getWithSessionId(request.body.friend_id);
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
        const yourSessionID = await Response.getSessionID(request);
        const yourAccount = Account.getWithSessionId(yourSessionID);
        const theirAccount = Account.getWithSessionId(request.body.uid);

        yourAccount.friends.Ignore.push(request.body.uid);
        for (const friend in yourAccount.friends.Friends) {
            if (yourAccount.friends.Friends[friend]._id === request.body.uid) {
                yourAccount.friends.Friends[friend].Ignored = true;
            }
        }

        theirAccount.friends.InIgnoreList.push(yourAccount.id);

        await Account.save(yourSessionID);
        await Account.save(request.body.uid);

        return Response.zlibJsonReply(
            reply,
            await Response.applyEmpty("array")
        );

    }

    static async clientFriendIgnoreRemove(request, reply) {
        const yourSessionID = await Response.getSessionID(request);
        const yourAccount = Account.getWithSessionId(yourSessionID);
        const theirAccount = Account.getWithSessionId(request.body.uid);

        yourAccount.friends.Ignore = yourAccount.friends.Ignore.filter(id => id !== request.body.uid);
        for (const friend in yourAccount.friends.Friends) {
            if (yourAccount.friends.Friends[friend]._id === request.body.uid) {
                yourAccount.friends.Friends[friend].Ignored = false;
            }
        }

        theirAccount.friends.InIgnoreList = theirAccount.friends.InIgnoreList.filter(id => id !== yourAccount.id);

        await Account.save(yourSessionID);
        await Account.save(request.body.uid);

        return Response.zlibJsonReply(
            reply,
            await Response.applyEmpty("array")
        );
    }

}

export class FriendControllerUtil {
    static miniAccountTemplate(character) {
        return ({
            _id: character.aid,
            Info: {
                Nickname: character.Info.Nickname,
                Side: character.Info.Side,
                Level: character.Info.Level,
                MemberCategory: character.Info.MemberCategory
            }
        })
    }

    /**
     * 
     * @param {string} id 
     * @param {string} to 
     * @param {string} from 
     * @param {obj} character 
     * @returns {<Promise>obj}
     */
    static createFriendRequest(id, from, to, character) {
        return ({
            _id: id,
            from: from,
            to: to,
            date: getCurrentTimestamp(),
            profile: this.miniAccountTemplate(character)
        })
    }
}