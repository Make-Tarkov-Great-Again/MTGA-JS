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

    static clientGameProfileAcceptQuest = async (moveAction = null, reply = null, sessionID = null) => {
        const playerProfile = await Profile.get(sessionID);
        const quest = await Quest.get(moveAction.qid);
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
        return {};
    };

    static clientGameProfileMoveItem = async (moveAction = null, reply = null, sessionID = null) => {
        const playerProfile = await Profile.get(sessionID);
        if (!playerProfile) {
            // display error
        }

        logger.logDebug("Move request:");
        logger.logDebug(moveAction);

        const movedItems = await playerProfile.character.moveItems(moveAction);
        if (movedItems) {
            return {};
        } else {
            // display error
        }
    };

    static clientGameProfileExamine = async (moveAction = null, reply = null, sessionID = null) => {
        const playerProfile = await Profile.get(sessionID);
        if (!playerProfile) {
            // display error
        }

        logger.logDebug("Examin request:");
        logger.logDebug(moveAction);

        let templateItem;
        if (moveAction.fromOwner && moveAction.fromOwner.type === "Trader") {
            const trader = await Trader.get(moveAction.fromOwner.id);
            if (trader) {
                const inventoryItem = await trader.getAssortItemByID(moveAction.item);
                if (inventoryItem) {
                    templateItem = await Item.get(inventoryItem._tpl);
                } else {
                    logger.logError(`Examine Request failed: Unable to find item database template of itemId ${moveAction.item}`);
                    return false;
                }
            } else {
                logger.logError("Examine Request failed: Unable to get trader data.");
                return false;
            }
        } else {
            const item = await playerProfile.character.getInventoryItemByID(moveAction.item);
            if (item) {
                templateItem = await Item.get(item._tpl);
            } else {
                logger.logError(`Examine Request failed: Unable to find item database template of itemId ${moveAction.item}`);
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

        return {};
    };

    static clientGameProfileTradingConfirm = async (moveAction = null, reply = null, sessionID = null) => {
        logger.logDebug("Trading request:");
        logger.logDebug(moveAction);

        const playerProfile = await Profile.get(sessionID);
        const trader = await Trader.get(moveAction.tid);

        if (moveAction.type === 'buy_from_trader') {
            const traderItem = await trader.getAssortItemByID(moveAction.item_id);
            const traderAssort = await trader.getFilteredAssort(playerProfile);
            const traderItemChildren = await traderItem.getAllChildItemsInInventory(traderAssort.items);
            const traderItemTemplate = await Item.get(traderItem._tpl);

            let preparedChildren = false;
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

            // Merge existing item to reach max stack
            let itemsAdded;
            let itemsMerged;
            let remainingStack = moveAction.count;
            const maxStack = await traderItemTemplate.getStackInfo();
            if (maxStack) {
                const existingStacks = await playerProfile.character.getInventoryItemsByTpl(traderItemTemplate._id);
                [itemsMerged, remainingStack] = await playerProfile.character.addItemToStack(existingStacks, maxStack, moveAction.count);
                console.log(itemsMerged);
                console.log(remainingStack);
            }
            if (remainingStack) {
                itemsAdded = await playerProfile.character.addItem(await playerProfile.character.getStashContainer(), traderItem._tpl, preparedChildren, remainingStack);
            }
            if (itemsAdded || itemsMerged) {
                if (itemsAdded) {
                    output.items.new = itemsAdded;
                }
                if (itemsMerged) {
                    output.items.change = itemsMerged;
                }
                for (const scheme of moveAction.scheme_items) {
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
            logger.logDebug(output);
            logger.logDebug(output.items);
            logger.logDebug(output.items.change[0].upd);
            return output;
        } else if ( moveAction.type === 'sell_to_trader') {
            // TODO: LOAD TRADER PLAYER LOYALTY FOR COEF
            let output = {
                items: {
                    new: [],
                    change: [],
                    del: []
                }
            };
            let itemPrice = 0;
            for (const itemSelling of moveAction.items) {
                logger.logDebug(itemSelling);
                const item =  await playerProfile.character.getInventoryItemByID(itemSelling.id);
                const currentItemPrice = database.templates.PriceTable[item._tpl];
                itemPrice += currentItemPrice * itemSelling.count;
                await playerProfile.character.removeItems([item]);
                output.items.del.push({_id: item._id});
            }
                // Merge existing item to reach max stack
            let itemsAdded = [];
            let itemsMerged = [];
            let remainingStack = itemPrice;
            const currency = await trader.getBaseCurrency();
            const itemModel = await Item.get(currency);
            const maxStack = await itemModel.getStackInfo();
            if (maxStack) {
                const existingStacks = await playerProfile.character.getInventoryItemsByTpl(itemModel._id);
                [itemsMerged, remainingStack] = await playerProfile.character.addItemToStack(existingStacks, maxStack, remainingStack);
            }
            if (remainingStack) {
                itemsAdded = await playerProfile.character.addItem(await playerProfile.character.getStashContainer(), itemModel, false, remainingStack);
            }
            output.items.new = itemsAdded;
            output.items.change = itemsMerged;
            await playerProfile.save();
            return output;
        } else {
            logger.logError(`My brother in christ what are you trying to do ? ${moveAction.type} ? That shit is not done lmao pay me now.`);
        }
    };

    static clientGameProfileSplitItem = async (moveAction = null, reply = null, sessionID = null) => {
        const playerProfile = await Profile.get(sessionID);
        const splittedItems = await playerProfile.character.splitItems(moveAction);
        if (splittedItems) {
            return {
                items: { new: [splittedItems] }
            };
        }
    };

    static clientGameProfileMergeItem = async (moveAction = null, reply = null, sessionID = null) => {
        const playerProfile = await Profile.get(sessionID);
        const mergedItems = await playerProfile.character.mergeItems(moveAction);
        if (mergedItems) {
            return {
                items: { del: [mergedItems] }
            };
        }
    };

    static clientGameProfileRemoveItem = async (moveAction = null, reply = null, sessionID = null) => {
        const playerProfile = await Profile.get(sessionID);
        const deletedItems = await playerProfile.character.removeItems(moveAction);
        if (deletedItems) {
            return {
                items: { del: [deletedItems] }
            };
        }
    };

    static clientGameProfileFoldItem = async (moveAction = null, reply = null, sessionID = null) => {
        const playerProfile = await Profile.get(sessionID);
        if (playerProfile) {
            let item = await playerProfile.character.getInventoryItemByID(moveAction.item);
            if (item) {
                if (typeof item.upd === "undefined") {
                    item.upd = {}
                }

                if (typeof item.upd.Foldable === "undefined") {
                    item.upd.Foldable = {}
                }

                item.upd.Foldable.Folded = moveAction.value;
            }
        }
    }

    static clientGameProfileTagItem = async (moveAction = null, reply = null, sessionID = null) => {
        const playerProfile = await Profile.get(sessionID);
        if (playerProfile) {
            let item = await playerProfile.character.getInventoryItemByID(moveAction.item);
            if (item) {
                if (typeof item.upd === "undefined") {
                    item.upd = {}
                }

                if (typeof item.upd.Tag === "undefined") {
                    item.upd.Tag = {}
                }

                item.upd.Tag.Color = moveAction.TagColor;
                item.upd.Tag.Name = moveAction.TagName;
            }
        }
    }

    static clientGameProfileToggleItem = async (moveAction = null, reply = null, sessionID = null) => {
        const playerProfile = await Profile.get(sessionID);
        if (playerProfile) {
            let item = await playerProfile.character.getInventoryItemByID(moveAction.item);
            if (item) {
                if (typeof item.upd === "undefined") {
                    item.upd = {};
                }

                if (typeof item.upd.Togglable === "undefined") {
                    item.upd.Togglable = {};
                }

                item.upd.Togglable.On = moveAction.value;
            }
        }
    }

    static clientGameProfileBindItem = async (moveAction = null, reply = null, sessionID = null) => {
        const playerProfile = await Profile.get(sessionID);
        if (playerProfile) {
            for (let index in playerProfile.character.Inventory.fastPanel) {
                if(playerProfile.character.Inventory.fastPanel[index] === moveAction.item) {
                    playerProfile.character.Inventory.fastPanel[index] = "";
                }
            }
            playerProfile.character.Inventory.fastPanel[moveAction.index] = moveAction.item;
        }
    }

    static clientGameProfileReadEncyclopedia = async (moveAction = null, reply = null, sessionID = null) => {
        const playerProfile = await Profile.get(sessionID);
        if (playerProfile) {
            for (let id of moveAction.ids) {
                playerProfile.character.Encyclopedia[id] = true;
            }
        }
    }

}
module.exports.GameController = GameController;