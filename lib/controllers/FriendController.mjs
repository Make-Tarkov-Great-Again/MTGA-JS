import { generateMongoID, getCurrentTimestamp, logger } from "../utilities/_index.mjs";
import { Account, Profile, Dialogues, Character, Response } from "../classes/_index.mjs";

export class FriendController {

    static async clientGameProfileSearch(request, reply) {
        const sessionID = Response.getSessionID(request);
        const { nickname } = request.body;

        const profiles = Profile.getAll().filter(
            ({ id, character }) =>
                id !== sessionID && character?.Info?.Nickname === nickname
        );

        if (profiles.length === 0) {
            logger.warn('[PROFILE SEARCH] You are alone in this world....');
            return Response.zlibJsonReply(reply, Response.applyBody([]));
        }

        const output = profiles.map(
            ({ character }) =>
                FriendControllerUtil.miniAccountTemplate(character)
        );

        return Response.zlibJsonReply(reply, Response.applyBody(output));
    }

    static async clientMailMessageSend(request, reply) {
        const yourSessionID = Response.getSessionID(request);
        const { dialogId, text } = request.body; //dialogId is the sessionID of the person you are sending the message to

        const message = Dialogues.playerMessageForMessageSend(text, yourSessionID);
        const [yourMini, theirMini] = await Promise.all([
            FriendControllerUtil.miniAccountTemplate(Character.get(yourSessionID)),
            FriendControllerUtil.miniAccountTemplate(Character.get(dialogId))
        ]);

        await Promise.all([ //create both dialogues to the database
            Dialogues.createPlayerDialogue(dialogId, yourSessionID, message, [yourMini, theirMini]),
            Dialogues.createPlayerDialogue(yourSessionID, dialogId, message, [theirMini, yourMini])
        ]);

        await Promise.all([ //save both dialogues
            Dialogues.save(yourSessionID),
            Dialogues.save(dialogId)
        ]);

        return Response.zlibJsonReply(
            reply,
            Response.applyBody(message._id)
        );
    }

    static async clientFriendRequestListOutbox(sessionID, reply = null) {
        const { friendRequestOutbox = [] } = Account.getWithSessionId(sessionID) ?? {};
        await Account.save(sessionID);

        return Response.zlibJsonReply(
            reply,
            { err: 0, data: friendRequestOutbox });
    }

    static async clientFriendRequestListInbox(sessionID, reply) {
        const { friendRequestInbox = [] } = Account.getWithSessionId(sessionID) ?? {};
        await Account.save(sessionID);

        return Response.zlibJsonReply(
            reply,
            { err: 0, data: friendRequestInbox }
        )
    }

    static async clientFriendRequestList(sessionID, reply) {
        const { friends = {} } = Account.getWithSessionId(sessionID) ?? {};

        if (!friends?.Friends) { //create friends object if it doesn't exist

            friends.Friends = [];
            friends.Ignore = [];
            friends.InIgnoreList = [];

            await Account.save(sessionID);
        }

        return Response.zlibJsonReply(
            reply,
            { err: 0, data: friends }
        )
    }

    static async clientFriendRequestSend(request, reply) {
        const theirSessionID = request.body.to;
        const yourSessionID = Response.getSessionID(request);

        const [theirAccount, yourAccount] = await Promise.all([
            Account.getWithSessionId(theirSessionID),
            Account.getWithSessionId(yourSessionID)
        ]);

        const requestId = generateMongoID();
        const messageFrom = FriendControllerUtil.createFriendRequest(
            requestId,
            yourSessionID,
            theirSessionID,
            Character.get(yourSessionID)
        );
        theirAccount.friendRequestInbox.push(messageFrom);

        const messageTo = FriendControllerUtil.createFriendRequest(
            requestId,
            yourSessionID,
            theirSessionID,
            Character.get(theirSessionID)
        );
        yourAccount.friendRequestOutbox.push(messageTo);

        await Account.save(theirSessionID);
        await Account.save(yourSessionID);

        return Response.zlibJsonReply(
            reply,
            Response.applyBody({
                requestId: requestId,
                retryAfter: 30,
                status: 0
            })
        );
    }


    static async clientFriendRequestCancel(request, reply) {
        const yourSessionID = Response.getSessionID(request);
        const yourAccount = Account.getWithSessionId(yourSessionID);
        const yourOutbox = yourAccount.friendRequestOutbox;

        for (let i = yourOutbox.length - 1; i >= 0; i--) {
            if (yourOutbox[i]._id !== request.body.requestId)
                continue;

            const theirSessionID = yourOutbox[outbox].to;
            const theirAccount = Account.getWithSessionId(theirSessionID);
            const theirInbox = theirAccount.friendRequestInbox;

            for (let j = theirInbox.length - 1; j >= 0; j--) {
                if (theirInbox[j]._id !== request.body.requestId)
                    continue;

                theirInbox.splice(j, 1);
                await Account.save(theirSessionID);
                break;
            }

            yourOutbox.splice(i, 1);
            await Account.save(yourSessionID);
            break;
        }

        return Response.zlibJsonReply(
            reply,
            request.body.requestId
        );
    }

    static async clientFriendRequestAccept(request, reply) {
        const yourSessionID = Response.getSessionID(request);
        const yourAccount = Account.getWithSessionId(yourSessionID);
        const yourInbox = yourAccount.friendRequestInbox;

        if (!yourAccount?.friends) { //create friends object if it doesn't exist
            yourAccount.friends = {
                Friends: [],
                Ignore: [],
                InIgnoreList: []
            };
        }

        for (let i = yourInbox.length - 1; i >= 0; i--) {
            if (yourInbox[i]._id !== request.body.request_id)
                continue;

            const theirSessionID = yourInbox[i].from;
            const theirAccount = Account.getWithSessionId(theirSessionID);
            const theirOutbox = theirAccount.friendRequestOutbox;

            if (!theirAccount?.friends) { //create friends object if it doesn't exist
                theirAccount.friends = {
                    Friends: [],
                    Ignore: [],
                    InIgnoreList: []
                };
            }

            for (let o = theirOutbox.length - 1; o >= 0; o--) {
                if (theirOutbox[o]._id !== request.body.request_id) continue;

                theirAccount.friends.Friends.push(theirOutbox[o].profile);
                theirOutbox.splice(o, 1);
                await Account.save(theirSessionID);
                break;
            }

            yourAccount.friends.Friends.push(yourInbox[i].profile);
            yourInbox.splice(i, 1);
            await Account.save(yourSessionID);
            break;
        }

        return Response.zlibJsonReply(
            reply,
            Response.applyBody(true)
        );
    }

    static async clientFriendRequestDecline(request, reply) {
        const yourSessionID = Response.getSessionID(request);
        const yourAccount = Account.getWithSessionId(yourSessionID);
        const yourInbox = yourAccount.friendRequestInbox;

        for (let i = yourInbox.length - 1; i >= 0; i--) {
            if (yourInbox[i]._id !== request.body.request_id)
                continue;

            const theirSessionID = yourInbox[i].from;
            const theirAccount = Account.getWithSessionId(theirSessionID);
            const theirOutbox = theirAccount.friendRequestOutbox;

            for (let o = theirOutbox.length - 1; o >= 0; o--) {
                if (theirOutbox[o]._id !== request.body.request_id)
                    continue;

                theirOutbox.splice(o, 1);
                await Account.save(theirSessionID);
                break;
            }

            yourInbox.splice(i, 1);
            await Account.save(yourSessionID);
            break;
        }

        return Response.zlibJsonReply(
            reply,
            Response.applyBody(false)
        );
    }

    static async clientFriendDelete(request, reply) {
        const yourSessionID = Response.getSessionID(request);
        const yourAccount = Account.getWithSessionId(yourSessionID);
        const yourFriends = yourAccount.friends.Friends;

        for (let mine = yourFriends.length - 1; mine >= 0; mine--) {
            if (yourFriends[mine]._id !== request.body.friend_id)
                continue;

            const theirAccount = Account.getWithSessionId(request.body.friend_id);
            const theirFriends = theirAccount.friends.Friends;
            for (let their = theirFriends.length - 1; their >= 0; their--) {
                if (theirFriends[their]._id !== yourAccount.id)
                    continue;

                theirFriends.splice(their, 1);
                await Account.save(request.body.friend_id);
                break;
            }

            yourFriends.splice(mine, 1);
            await Account.save(yourSessionID);
            break;
        }

        return Response.zlibJsonReply(
            reply,
            Response.applyEmpty("array")
        );
    }

    static async clientFriendIgnoreSet(request, reply) {
        const yourSessionID = Response.getSessionID(request);
        const yourAccount = Account.getWithSessionId(yourSessionID);
        const theirSessionID = request.body.uid;
        const theirAccount = Account.getWithSessionId(theirSessionID);

        yourAccount.friends.Ignore.push(theirSessionID);
        const friendIndex = yourAccount.friends.Friends
            .findIndex(f => f._id === theirSessionID);

        if (friendIndex !== -1) {
            yourAccount.friends.Friends[friendIndex].Ignored = true;
        }
        theirAccount.friends.InIgnoreList.push(yourAccount.id);

        await Promise.all([
            Account.save(yourSessionID),
            Account.save(theirSessionID)
        ]);

        return Response.zlibJsonReply(
            reply,
            Response.applyEmpty("array")
        );
    }

    static async clientFriendIgnoreRemove(request, reply) {
        const yourSessionID = Response.getSessionID(request);
        const yourAccount = Account.getWithSessionId(yourSessionID);
        const theirSessionID = request.body.uid;
        const theirAccount = Account.getWithSessionId(theirSessionID);

        yourAccount.friends.Ignore = yourAccount.friends.Ignore
            .filter(id => id !== theirSessionID);

        const friendIndex = yourAccount.friends.Friends
            .findIndex(f => f._id === theirSessionID);

        if (friendIndex !== -1) {
            yourAccount.friends.Friends[friendIndex].Ignored = false;
        }

        theirAccount.friends.InIgnoreList = theirAccount.friends.InIgnoreList
            .filter(id => id !== yourAccount.id);

        await Promise.all([
            Account.save(yourSessionID),
            Account.save(theirSessionID)
        ]);

        return Response.zlibJsonReply(
            reply,
            Response.applyEmpty("array")
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