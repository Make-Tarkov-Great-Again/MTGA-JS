const { database } = require("../../../app");
const { Profile, Language, Account, Edition, Customization, Storage, Character, Health, Weaponbuild, Quest, Locale, Trader, Item } = require("../../models");
const { generateUniqueId ,getCurrentTimestamp, logger, FastifyResponse, writeFile, stringify, readParsed, payTrade } = require("../../utilities");


class GameController {
    // JET Basics //
    static modeOfflinePatches = async (_request = null, reply = null) => {
        return FastifyResponse.zlibJsonReply(reply, database.core.serverConfig.Patches);
    };

    static modeOfflinePatchNodes = async (_request = null, reply = null) => {
        return FastifyResponse.zlibJsonReply(reply, database.core.serverConfig.PatchNodes);
    };
    // Game //

    static clientGameStart = async (request = null, reply = null) => {
        let playerProfile = Profile.get(await FastifyResponse.getSessionID(request));
        if (playerProfile) {
            return FastifyResponse.zlibJsonReply
                (
                    reply,
                    FastifyResponse.applyBody
                        (
                            { utc_time: Date.now() / 1000 },
                            0,
                            null
                        )
                );
        } else {
            return FastifyResponse.zlibJsonReply
                (
                    reply,
                    FastifyResponse.applyBody
                        (
                            { utc_time: Date.now() / 1000 },
                            999,
                            "Profile Not Found!!"
                        )
                );
        }
    };

    static clientGameVersionValidate = async (request = null, reply = null) => {
        logger.logInfo("Client connected with version: " + request.body.version.major);
        await FastifyResponse.zlibJsonReply
            (
                reply,
                FastifyResponse.applyBody(null)
            );
    };

    static clientGameConfig = async (request = null, reply = null) => {
        const sessionID = await FastifyResponse.getSessionID(request);
        const responseObject = {
            aid: sessionID,
            lang: "en",
            languages: await Language.getAllWithoutKeys(),
            ndaFree: false,
            taxonomy: 6,
            activeProfileId: "pmc" + sessionID,
            backend: {
                Trading: FastifyResponse.getBackendURL(),
                Messaging: FastifyResponse.getBackendURL(),
                Main: FastifyResponse.getBackendURL(),
                RagFair: FastifyResponse.getBackendURL()
            },
            utc_time: getCurrentTimestamp(),
            totalInGame: 0,
            reportAvailable: true,
            twitchEventMember: false,
        };
        /* 
        nickname: "user",
        token: sessionID,
        queued: false,
        banTime: 0,
        hash: "BAN0",
        */

        await FastifyResponse.zlibJsonReply
            (
                reply,
                FastifyResponse.applyBody(responseObject)
            );
    };

    static clientGameKeepAlive = async (request = null, reply = null) => {
        let msg = "OK";

        const sessionID = await FastifyResponse.getSessionID(request);
        if (typeof sessionID == "undefined") msg = "No Session";

        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody({ msg: msg, utc_time: getCurrentTimestamp() })
        );
    };

    static clientProfileList = async (request = null, reply = null) => {
        const output = [];

        // Implement with offline raiding //
        const dummyScavData = readParsed("./scavDummy.json");


        dummyScavData.aid = "scav" + await FastifyResponse.getSessionID(request);

        const playerAccount = await Account.get(await FastifyResponse.getSessionID(request));
        if (!playerAccount.wipe) {
            const profile = await playerAccount.getProfile();
            if (profile.character.length !== 0) {
                const character = await profile.getPmc();
                const pmc = await character.dissolve();
                output.push(pmc);
                //output.push(await profile.getScav());
                output.push(dummyScavData);
            }
        }
        //console.log(output);
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(output)
        );
    };

    static clientProfileSelect = async (request = null, reply = null) => {
        const sessionID = await FastifyResponse.getSessionID(request);
        const output = {
            "status": "ok",
            "notifier": FastifyResponse.getNotifier(sessionID),
            "notifierServer": FastifyResponse.getNotifier(sessionID).notifierServer
        };
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(output)
        );
    };

    static clientGameProfileNicknameReserved = async (_request = null, reply = null) => {
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody("")
        )
    };

    static clientGameProfileNicknameValidate = async (request = null, reply = null) => {
        const validate = await Profile.ifAvailableNickname(request.body.nickname);

        switch (validate) {
            case "ok":
                return FastifyResponse.zlibJsonReply(
                    reply,
                    FastifyResponse.applyBody({ status: "ok" })
                );
            case "tooshort":
                return FastifyResponse.zlibJsonReply(
                    reply,
                    FastifyResponse.applyBody(null, 256, "256 -")
                );
            case "taken":
                return FastifyResponse.zlibJsonReply(
                    reply,
                    FastifyResponse.applyBody(null, 255, "255 - ")
                );
        }
    };

    static clientGameProfileCreate = async (request = null, reply = null) => {
        const sessionID = await FastifyResponse.getSessionID(request);
        const playerAccount = await Account.get(sessionID);
        if (!playerAccount) {
            logger.logDebug("[clientGameProfileCreate] Invalid player account.");
            return;
        }

        const voice = await Customization.get(request.body.voiceId);

        const chosenSide = request.body.side.toLowerCase();
        const chosenSideCapital = chosenSide.charAt(0).toUpperCase() + chosenSide.slice(1);

        const profile = new Profile(playerAccount.id);
        const character = await playerAccount.edition.getCharacterTemplateBySide(chosenSide);
        const newID = await generateUniqueId();
        character._id = "pmc" + newID;
        character.aid = playerAccount.id;
        character.savage = "scav" + newID;
        character.Info = {};
        character.Info.Side = chosenSideCapital;
        character.Info.Nickname = request.body.nickname;
        character.Info.LowerNickname = request.body.nickname.toLowerCase();
        character.Info.Voice = voice._name;
        character.Info.RegistrationDate = ~~(new Date() / 1000);
        character.Health.UpdateTime = ~~(Date.now() / 1000);

        character.Customization.Head = await Customization.get(request.body.headId);

        profile.character = character;

        profile.storage = {
            _id: character._id,
            suites: playerAccount.edition.storage[chosenSide]
        };
        playerAccount.wipe = false;

        profile.userbuilds = {};
        profile.dialogues = {};

        await Promise.all([
            profile.save(),
            playerAccount.save()
        ]);

        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody({ uid: "pmc" + sessionID })
        );
    };

    static clientGameProfileVoiceChange = async (request = null, reply = null) => {
        const playerProfile = await Profile.get(await FastifyResponse.getSessionID(request));
        playerProfile.character.Info.Voice = request.body.voice;
        await playerProfile.save();
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody({
                status: 0,
                nicknamechangedate: ~~(new Date() / 1000)
            })
        );
    };

    static clientGameProfileNicknameChange = async (request = null, reply = null) => {
        const playerProfile = await Profile.get(await FastifyResponse.getSessionID(request));
        const validate = await Profile.ifAvailableNickname(request.body.nickname);


        switch (validate) {
            case "ok":
                playerProfile.character.Info.Nickname = request.body.nickname;
                playerProfile.character.Info.LowerNickname = request.body.nickname.toLowerCase();
                await playerProfile.saveCharacter();

                return FastifyResponse.zlibJsonReply(
                    reply,
                    FastifyResponse.applyBody({
                        status: 0,
                        nicknamechangedate: ~~(new Date() / 1000)
                    })
                );
            case "tooshort":
                return FastifyResponse.zlibJsonReply(
                    reply,
                    FastifyResponse.applyBody(null, 256, "256 -")
                );
            case "taken":
                return FastifyResponse.zlibJsonReply(
                    reply,
                    FastifyResponse.applyBody(null, 255, "255 - ")
                );
        }
    };

    static clientGameProfileAcceptQuest = async (request = null, reply = null) => {
        const playerProfile = await Profile.get(await FastifyResponse.getSessionID(request));
        const quest = await Quest.get(request.body.data[0].qid);
        const questReward = await quest.getRewards(playerProfile, "Started");
        await playerProfile.character.addQuest(quest);
        const userAccount = await Account.get(playerProfile.id);
        const userLanguage = userAccount.getLanguage();
        const locales = await Locale.get(userLanguage);
        const questLocale = await locales.getQuestLocales(quest._id);
        const messageContent = {
            templateId: questLocale.startedMessageText,
            type: 10,
            maxStorageTime: database.core.gameplay.other.RedeemTime * 3600
        };
        await playerProfile.addDialogue(quest.traderId, messageContent, questReward);
        await playerProfile.save();
        const changes = {};
        const profileChangesBase = await playerProfile.getProfileChangesResponse(changes);
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(profileChangesBase)
        );
    };

    static clientGameProfileMoveItem = async (request = null, reply = null) => {
        const playerProfile = await Profile.get(await FastifyResponse.getSessionID(request));
        if (!playerProfile) {
            // display error
        }

        logger.logDebug("Move request:")
        logger.logDebug(request.body.data);

        let movedItems = await playerProfile.character.moveItems(request.body.data);
        if (movedItems) {
            if (await playerProfile.save()) {
                let changes = {
                    // Broken? Seems to fuck with containers? - Compare with dumps of moving containers
                    //items: { change: [movedItems] }
                }
                let profileChangesBase = await playerProfile.getProfileChangesResponse(changes);
                return FastifyResponse.zlibJsonReply(
                    reply,
                    FastifyResponse.applyBody(profileChangesBase)
                );
            } else {
                // display error
            }
        } else {
            // display error
        }
    };

    static clientGameProfileExamine = async (request = null, reply = null) => {
        const playerProfile = await Profile.get(await FastifyResponse.getSessionID(request));
        if (!playerProfile) {
            // display error
        }

        logger.logDebug("Examin request:");
        logger.logDebug(request.body.data);

        for (const requestEntry of request.body.data) {
            let templateItem;
            if (requestEntry.fromOwner && requestEntry.fromOwner.type === "Trader") {
                const trader = await Trader.get(requestEntry.fromOwner.id);
                if (trader) {
                    const inventoryItem = await trader.getAssortItemByID(requestEntry.item);
                    if (inventoryItem) {
                        templateItem = await Item.get(inventoryItem._tpl);
                    } else {
                        logger.logError(`Examine Request failed: Unable to find item database template of itemId ${requestEntry.item}`);
                        return false;
                    }
                } else {
                    logger.logError("Examine Request failed: Unable to get trader data.");
                    return false;
                }
            } else {
                const item = await playerProfile.character.getInventoryItemByID(requestEntry.item);
                if (item) {
                    templateItem = await Item.get(item._tpl);
                } else {
                    logger.logError(`Examine Request failed: Unable to find item database template of itemId ${requestEntry.item}`);
                    return false;
                }
            }

            if (templateItem) {
                if (await playerProfile.character.examineItem(templateItem._id)) {
                    await playerProfile.character.addExperience(templateItem._props.ExamineExperience);
                } else {
                    logger.logError(`Examine Request failed: Unable to examine itemId ${templateItem._id}`);
                }
            } else {
                logger.logError(`Examine Request failed: Unable to find item database template of itemId ${inventoryItem._tpl}`);
            }
        }

        if (await playerProfile.save()) {
            let changes = {
                // Fix
            }

            let profileChangesBase = await playerProfile.getProfileChangesResponse(changes);
            return FastifyResponse.zlibJsonReply(
                reply,
                FastifyResponse.applyBody(profileChangesBase)
            );
        } else {
            // display error
        }
    };

    static clientGameTradingConfirm = async (request = null, reply = null) => {
        const playerProfile = await Profile.get(await FastifyResponse.getSessionID(request));
        const trader = await Trader.get(request.body.data[0].tid);
        const currency = await trader.getCurrency();
        const isPayed = await payTrade(playerProfile.character.Inventory, request.body.data[0].scheme_items, currency);
    };

    static clientGameSplitItem = async (request = null, reply = null) => {
        const playerProfile = await Profile.get(await FastifyResponse.getSessionID(request));
        const profileChanges = await playerProfile.getProfileChangesBase();
        const pmc = await playerProfile.getPmc();
        for (const item of playerProfile.character.Inventory.items) {
            if (item._id === request.body.data[0].item) {
                item.upd.StackObjectsCount -= request.body.data[0].count;
                const idItem = await generateUniqueId("", 24);
                profileChanges.profileChanges[pmc._id].items.new.push({
                    _id: idItem,
                    _tpl: item._tpl,
                    upd: { StackObjectsCount: request.body.data[0].count }
                });
                pmc.Inventory.items.push({
                    id: idItem,
                    _tpl: item._tpl,
                    parentId: request.body.data[0].container.id,
                    slotId: request.body.data[0].container.container,
                    location: request.body.data[0].container.location,
                    upd: { StackObjectsCount: request.body.data[0].count }
                });
                await playerProfile.save();
                break;
            }
        }
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(profileChanges)
        );
    };

}
module.exports.GameController = GameController;