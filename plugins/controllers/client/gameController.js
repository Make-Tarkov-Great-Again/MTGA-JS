const { forEach } = require("lodash");
const { database } = require("../../../app");
const { Profile, Language, Account, Edition, Customization, Storage, Character, Health, Weaponbuild, Quest, Locale, Trader, Item } = require("../../models");
const { generateUniqueId, getCurrentTimestamp, logger, FastifyResponse, writeFile, stringify, readParsed, payTrade } = require("../../utilities");


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
        return {};
    };

    static clientGameProfileMoveItem = async (request = null, reply = null) => {
        const playerProfile = await Profile.get(await FastifyResponse.getSessionID(request));
        if (!playerProfile) {
            // display error
        }

        logger.logDebug("Move request:")
        logger.logDebug(request.body.data);

        const movedItems = await playerProfile.character.moveItems(request.body.data);
        if (movedItems) {
            if (await playerProfile.save()) {
                return {};
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
            if (requestEntry.Action === "Examine") {
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
        }

        if (await playerProfile.save()) {
            return {};
        } else {
            // display error
        }
    };

    static clientGameTradingConfirm = async (request = null, reply = null) => {
        logger.logDebug("Trading request:");
        logger.logDebug(request.body.data);

        const playerProfile = await Profile.get(await FastifyResponse.getSessionID(request));
        for (const requestEntry of request.body.data) {
            if (requestEntry.Action === "TradingConfirm") {
                const trader = await Trader.get(requestEntry.tid);

                if (requestEntry.type === 'buy_from_trader') {
                    const traderItem = await trader.getAssortItemByID(requestEntry.item_id);
                    const traderAssort = await trader.getFilteredAssort(playerProfile);
                    const traderItemChildren = await traderItem.getAllChildItemsInInventory(traderAssort.items);
                    const traderItemTemplate = await Item.get(traderItem._tpl);

                    let preparedChildren = false
                    if (traderItemChildren) {
                        preparedChildren = await Item.prepareChildrenForAddItem(traderItem, traderItemChildren);
                    } else {
                        // Handle Ammoboxes //
                        if (traderItemTemplate._parent === "543be5cb4bdc2deb348b4568") {
                            if (typeof traderItemTemplate._props.StackSlots !== "undefined") {
                                preparedChildren = []
                                for (let stackedSlot of traderItemTemplate._props.StackSlots) {
                                    let childToAdd = {
                                        "_tpl": stackedSlot._props.filters[0].Filter[0],
                                        "slotId": stackedSlot._name,
                                        "upd": {
                                            "StackObjectsCount": stackedSlot._max_count
                                        }
                                    }
                                    preparedChildren.push(childToAdd);
                                }
                            }
                        }
                    }

                    let output = {
                        items: {
                            new: [],
                            change: [],
                            del: []
                        }
                    };

                    const itemsAdded = await playerProfile.character.addItem(await playerProfile.character.getStashContainer(), traderItem._tpl, preparedChildren, requestEntry.count);
                    if (itemsAdded) {
                        output.items.new = itemsAdded;
                        for (const scheme of requestEntry.scheme_items) {
                            const itemsTaken = await playerProfile.character.removeItem(scheme.id, scheme.count);
                            if (itemsTaken) {
                                if (typeof itemsTaken.changed !== "undefined") {
                                    output.items.change = output.items.change.concat(itemsTaken.changed);
                                }

                                if (typeof itemsTaken.removed !== "undefined") {
                                    output.items.del = output.items.del.concat(itemsTaken.removed);
                                }
                            } else {
                                logger.logDebug(`Unable to take items`);
                            }
                            /*await trader.reduceStock(requestEntry.item_id, requestEntry.count);*/
                        }
                    } else {
                        logger.logDebug(`Unable to add items`);
                    }

                    await playerProfile.save();
                    return output;
                }
            }
        }
    };

    static clientGameSplitItem = async (request = null, reply = null) => {
        const playerProfile = await Profile.get(await FastifyResponse.getSessionID(request));
        const splittedItems = await playerProfile.character.splitItems(request.body.data);
        if (splittedItems) {
            if (await playerProfile.save()) {
                return {
                    items: { new: [splittedItems] }
                };
            }
        }
    };

    static clientGameMergeItem = async (request = null, reply = null) => {
        const playerProfile = await Profile.get(await FastifyResponse.getSessionID(request));
        const mergedItems = await playerProfile.character.mergeItems(request.body.data);
        if (mergedItems) {
            if (await playerProfile.save()) {
                return {
                    items: { del: [mergedItems] }
                };
            }
        }
    };

    static clientGameRemoveItem = async (request = null, reply = null) => {
        const playerProfile = await Profile.get(await FastifyResponse.getSessionID(request));
        const deletedItems = await playerProfile.character.removeItems(request.body.data);
        if (deletedItems) {
            if (await playerProfile.save()) {
                return {
                    items: { del: [deletedItems] }
                };
            }
        }
    };

    static clientGameFoldItem = async (request = null, reply = null) => {
        for (const requestEntry of request.body.data) {
            if (requestEntry.Action === "Fold") {
                const playerProfile = await Profile.get(await FastifyResponse.getSessionID(request));
                if (playerProfile) {
                    let item = await playerProfile.character.getInventoryItemByID(requestEntry.item);
                    if (item) {
                        if (typeof item.upd === "undefined") {
                            item.upd = {}
                        }

                        if (typeof item.upd.Foldable === "undefined") {
                            item.upd.Foldable = {}
                        }

                        item.upd.Foldable.Folded = requestEntry.value;
                        await playerProfile.save();
                    }
                }
            }
        }
    }
}
module.exports.GameController = GameController;