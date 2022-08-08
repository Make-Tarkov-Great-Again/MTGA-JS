const { database } = require("../../app");
const { Profile } = require('../models/Profile');
const { Language } = require('../models/Language');
const { Account } = require('../models/Account');
const { Customization } = require('../models/Customization');
const { Quest } = require('../models/Quest');
const { Locale } = require('../models/Locale');
const { Trader } = require('../models/Trader');
const { Item } = require('../models/Item');
const { HideoutArea } = require('../models/HideoutArea');
const { HideoutProduction } = require('../models/HideoutProduction');
const { HideoutScavcase } = require('../models/HideoutScavcase');
const { Preset } = require('../models/Preset');
const { generateUniqueId, getCurrentTimestamp, logger, FastifyResponse, readParsed } = require("../../utilities");


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
                Trading: FastifyResponse.getBackendUrl(),
                Messaging: FastifyResponse.getBackendUrl(),
                Main: FastifyResponse.getBackendUrl(),
                RagFair: FastifyResponse.getBackendUrl()
            },
            utc_time: getCurrentTimestamp(),
            totalInGame: 0,
            reportAvailable: true,
            twitchEventMember: false
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

        dummyScavData.RegistrationDate = getCurrentTimestamp();
        dummyScavData.aid = await FastifyResponse.getSessionID(request); // AIDs need to be the same

        const playerAccount = await Account.get(await FastifyResponse.getSessionID(request));
        if (!playerAccount.wipe) {
            const profile = await playerAccount.getProfile();
            if (profile.character.length !== 0) {

                /**
                 * Generate scav and assign
                 */
                //output.push(await profile.getScav());
                output.push(dummyScavData);


                const character = await profile.getPmc();
                const pmc = await character.dissolve();
                pmc.savage = dummyScavData._id; //set pmc.savage var to scav id

                output.push(pmc);
            }
        }
        //console.log(output);
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(output)
        );
    };

    static clientProfileSelect = async (request, reply) => {
        const sessionID = await FastifyResponse.getSessionID(request);
        const output = {
            "status": "ok",
            "notifier": FastifyResponse.getNotifier(sessionID),
            "notifierServer": ""
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
        );
    };

    static clientGameProfileNicknameValidate = async (request = null, reply = null) => {
        const validate = await Profile.ifAvailableNickname(request.body.nickname);

        switch (validate) {
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
            default:
                return FastifyResponse.zlibJsonReply(
                    reply,
                    FastifyResponse.applyBody({ status: "ok" })
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
        character.Info.Side = chosenSideCapital;
        character.Info.Nickname = request.body.nickname;
        character.Info.LowerNickname = request.body.nickname.toLowerCase();
        character.Info.Voice = voice._name;
        character.Info.RegistrationDate = await getCurrentTimestamp();
        character.Health.UpdateTime = await getCurrentTimestamp();

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
            default:
                playerProfile.character.Info.Nickname = request.body.nickname;
                playerProfile.character.Info.LowerNickname = request.body.nickname.toLowerCase();
                await playerProfile.saveCharacter();
                return FastifyResponse.zlibJsonReply(
                    reply,
                    FastifyResponse.applyBody({
                        status: 0,
                        nicknamechangedate: await getCurrentTimestamp()
                    })
                );
        }
    };

    static clientGameProfileAcceptQuest = async (moveAction = null, reply = null, playerProfile = null) => {
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

    static clientGameProfileMoveItem = async (moveAction = null, reply = null, playerProfile = null) => {
        logger.logDebug("Move request:");
        logger.logDebug(moveAction);

        const movedItems = await playerProfile.character.moveItems(moveAction);
        if (movedItems) {
            return {};
        } else {
            // display error
        }
    };

    static clientGameProfileExamine = async (moveAction = null, reply = null, playerProfile = null) => {
        logger.logDebug("Examine request:");
        logger.logDebug(moveAction);

        let templateItem;

        if (typeof moveAction.fromOwner !== "undefined") {
            switch (moveAction.fromOwner.type) {
                case "Trader":
                    const trader = await Trader.get(moveAction.fromOwner.id);
                    if (trader) {
                        const inventoryItem = await trader.getAssortItemByID(moveAction.item);
                        if (inventoryItem) {
                            templateItem = await Item.get(inventoryItem._tpl);
                        } else {
                            logger.logError(`[clientGameProfileExamine] Examine Request failed: Unable to find item database template of itemId ${moveAction.item}`);
                            return false;
                        }
                    } else {
                        logger.logError("[clientGameProfileExamine] Examine Request failed: Unable to get trader data.");
                        return false;
                    }
                    break;

                case "RagFair":
                    const ragfairOffers = database.ragfair.offers;
                    const item = ragfairOffers.find(function (i) {
                        if (i._id === moveAction.fromOwner.id) return i;
                    });
                    templateItem = await Item.get(item.items[0]._tpl);
                    break;

                case "HideoutUpgrade":
                case "HideoutProduction":
                case "ScavCase":
                    templateItem = await Item.get(moveAction.item);
                    break;

                default:
                    logger.logError(`[clientGameProfileExamine] Examine Request failed: Unknown moveAction.fromOwner.Type: ${moveAction.fromOwner.type}`);
                    return false;
            }
        } else {
            const item = await playerProfile.character.getInventoryItemByID(moveAction.item);
            if (item) {
                templateItem = await Item.get(item._tpl);
            } else {
                logger.logError(`[clientGameProfileExamine] Examine Request failed: Unable to find item database template of itemId ${moveAction.item}`);
                return false;
            }
        }

        if (templateItem) {
            if (await playerProfile.character.examineItem(templateItem._id)) {
                await playerProfile.character.addExperience(templateItem._props.ExamineExperience);
            } else {
                logger.logError(`[clientGameProfileExamine] Examine Request failed: Unable to examine itemId ${templateItem._id}`);
            }
        } else {
            // this will crash because inventoryItem can't be reached
            logger.logError(`[clientGameProfileExamine] Examine Request failed: Unable to find item database template of itemId ${inventoryItem._tpl}`);
        }

        return {};
    };

    static clientGameProfileTradingConfirm = async (moveAction = null, _reply = null, playerProfile = null) => {
        logger.logDebug("[clientGameProfileTradingConfirm] Trading request:");
        logger.logDebug(moveAction);
        const trader = await Trader.get(moveAction.tid);
        const output = {
            items: {
                new: [],
                change: [],
                del: []
            }
        };
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
                            };
                            preparedChildren.push(childToAdd);
                        }
                    }
                }
            }
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
                        logger.logError(`[clientGameProfileTradingConfirm] Unable to take items`);
                    }
                    /*await trader.reduceStock(requestEntry.item_id, requestEntry.count);*/
                }
            } else {
                logger.logDebug(`[clientGameProfileTradingConfirm] Unable to add items`);
            }
            logger.logDebug(output);
            logger.logDebug(output.items);
            logger.logDebug(output.items.change[0].upd);
        } else if (moveAction.type === 'sell_to_trader') {
            // TODO: LOAD TRADER PLAYER LOYALTY FOR COEF
            let itemPrice = 0;
            for (const itemSelling of moveAction.items) {
                logger.logDebug(itemSelling);
                const item = await playerProfile.character.getInventoryItemByID(itemSelling.id);
                const currentItemPrice = database.templates.PriceTable[item._tpl];
                itemPrice += currentItemPrice * itemSelling.count;
                await playerProfile.character.removeItem(item._id);
                output.items.del.push({ _id: item._id });
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
                itemsAdded = await playerProfile.character.addItem(await playerProfile.character.getStashContainer(), currency, false, remainingStack);
            }
            output.items.new = itemsAdded;
            output.items.change = itemsMerged;
            logger.logDebug(output);
            logger.logDebug(output.items.change);
            logger.logDebug(output.items.new);

        } else if (moveAction.Action === 'RagFairBuyOffer') {
            console.log(moveAction);
            const ragfairOffers = database.ragfair.offers;
            const item = ragfairOffers.find(function (i) {
                if (i._id === moveAction.offers[0].id) return i;
            });

            console.log(item.items[0]._tpl)
            const itemTemplate = await Item.get(item.items[0]._tpl);

            //const unpreparedChildren = await Item.getAllChildItemsInInventory(item.items);
            let preparedChildren = false;
            if (item.items.length > 0) {
                preparedChildren = await Item.prepareChildrenForAddItem(item.items[0], item.items);
            }


            // Merge existing item to reach max stack
            let itemsAdded;
            let itemsMerged;
            let remainingStack = moveAction.offers[0].count;
            const maxStack = await itemTemplate.getStackInfo();
            if (maxStack) {
                const existingStacks = await playerProfile.character.getInventoryItemsByTpl(itemTemplate._id);

                [itemsMerged, remainingStack] = await playerProfile.character.addItemToStack(
                    existingStacks,
                    maxStack,
                    moveAction.offers[0].count
                );

                console.log(itemsMerged);
                console.log(remainingStack);
            }
            if (remainingStack) {
                itemsAdded = await playerProfile.character.addItem(
                    await playerProfile.character.getStashContainer(),
                    item.items[0]._tpl,
                    preparedChildren,
                    remainingStack
                );
            }
            if (itemsAdded || itemsMerged) {
                if (itemsAdded) {
                    output.items.new = itemsAdded;
                }
                if (itemsMerged) {
                    output.items.change = itemsMerged;
                }
                for (const scheme of moveAction.offers[0].items) {
                    const itemsTaken = await playerProfile.character.removeItem(
                        scheme.id,
                        scheme.count
                    );

                    if (itemsTaken) {
                        if (typeof itemsTaken.changed !== "undefined") {
                            output.items.change = output.items.change.concat(itemsTaken.changed);
                        }

                        if (typeof itemsTaken.removed !== "undefined") {
                            output.items.del = output.items.del.concat(itemsTaken.removed);
                        }
                    } else {
                        logger.logError(`[clientGameProfileTradingConfirm] Unable to take items`);
                    }
                    /*await trader.reduceStock(requestEntry.item_id, requestEntry.count);*/
                }
            } else { logger.logError(`[clientGameProfileTradingConfirm] Unable to add items`); }

            logger.logDebug(output);
            logger.logDebug(output.items);
            logger.logDebug(output.items.change[0].upd);
        } else {
            logger.logError(`[clientGameProfileTradingConfirm] My brother in christ what are you trying to do ? ${moveAction.type} ? That shit is not done lmao pay me now.`);
        }
        return output;
    };

    static clientGameProfileSplitItem = async (moveAction = null, _reply = null, playerProfile = null) => {
        const splittedItems = await playerProfile.character.splitItems(moveAction);
        if (splittedItems) {
            return {
                items: { new: [splittedItems] }
            };
        }
    };

    static clientGameProfileMergeItem = async (moveAction = null, _reply = null, playerProfile = null) => {
        const mergedItems = await playerProfile.character.mergeItems(moveAction);
        if (mergedItems) {
            return {
                items: { del: [mergedItems] }
            };
        }
    };

    static clientGameProfileRemoveItem = async (moveAction = null, _reply = null, playerProfile = null) => {
        const deletedItems = await playerProfile.character.removeItems(moveAction);
        if (deletedItems) {
            return {
                items: { del: [deletedItems] }
            };
        }
    };

    static clientGameProfileFoldItem = async (moveAction = null, _reply = null, playerProfile = null) => {
        if (playerProfile) {
            const item = await playerProfile.character.getInventoryItemByID(moveAction.item);
            if (item) {
                if (typeof item.upd === "undefined") {
                    item.upd = {};
                }

                if (typeof item.upd.Foldable === "undefined") {
                    item.upd.Foldable = {};
                }

                item.upd.Foldable.Folded = moveAction.value;
            }
        }
    };

    static clientGameProfileTagItem = async (moveAction = null, _reply = null, playerProfile = null) => {
        if (playerProfile) {
            const item = await playerProfile.character.getInventoryItemByID(moveAction.item);
            if (item) {
                if (typeof item.upd === "undefined") {
                    item.upd = {};
                }

                if (typeof item.upd.Tag === "undefined") {
                    item.upd.Tag = {};
                }

                item.upd.Tag.Color = moveAction.TagColor;
                item.upd.Tag.Name = moveAction.TagName;
            }
        }
    };

    static clientGameProfileToggleItem = async (moveAction = null, _reply = null, playerProfile = null) => {
        if (playerProfile) {
            const item = await playerProfile.character.getInventoryItemByID(moveAction.item);
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
    };

    static clientGameProfileBindItem = async (moveAction = null, _reply = null, playerProfile = null) => {
        if (playerProfile) {
            for (const index in playerProfile.character.Inventory.fastPanel) {
                if (playerProfile.character.Inventory.fastPanel[index] === moveAction.item) {
                    playerProfile.character.Inventory.fastPanel[index] = "";
                }
            }
            playerProfile.character.Inventory.fastPanel[moveAction.index] = moveAction.item;
        }
    };

    static clientGameProfileReadEncyclopedia = async (moveAction = null, _reply = null, playerProfile = null) => {
        if (playerProfile) {
            for (const id of moveAction.ids) {
                playerProfile.character.Encyclopedia[id] = true;
            }
        }
    };

    static clientGameProfileHideoutUpgrade = async (moveAction = null, _reply = null, playerProfile = null) => {
        logger.logDebug(moveAction);
        if (playerProfile) {
            const templateHideoutArea = await HideoutArea.getBy("type", moveAction.areaType);
            const characterHideoutArea = await playerProfile.character.getHideoutAreaByType(moveAction.areaType);

            if (!templateHideoutArea) {
                logger.logError(`[clientGameProfileHideoutUpgrade] Upgrading HideoutArea failed. Unknown hideout area ${moveAction.areaType} in hideoutArea database.`);
                return;
            }

            if (!characterHideoutArea) {
                logger.logError(`[clientGameProfileHideoutUpgrade] Upgrading HideoutArea failed. Unknown hideout area ${moveAction.areaType} in character profile.`);
                return;
            }

            //logger.logDebug(templateHideoutArea);
            //logger.logDebug(characterHideoutArea);

            const nextLevel = characterHideoutArea.level + 1;
            if (typeof templateHideoutArea.stages[nextLevel] === "undefined") {
                logger.logError(`[clientGameProfileHideoutUpgrade] Upgrading HideoutArea ${templateHideoutArea._id} for character ${playerProfile.character._id} failed. The level ${nextLevel} doesn't exist.`);
                return;
            }

            const output = {
                items: {
                    new: [],
                    change: [],
                    del: []
                }
            };

            let allItemsTaken = true;
            for (const itemToTake of moveAction.items) {
                const itemTaken = await playerProfile.character.removeItem(itemToTake.id, itemToTake.count);
                if (itemTaken) {
                    if (typeof itemTaken.changed !== "undefined") {
                        output.items.change = output.items.change.concat(itemTaken.changed);
                    }

                    if (typeof itemTaken.removed !== "undefined") {
                        output.items.del = output.items.del.concat(itemTaken.removed);
                    }
                } else {
                    allItemsTaken = false;
                }
                /*await trader.reduceStock(requestEntry.item_id, requestEntry.count);*/
            }

            if (allItemsTaken) {
                const templateHideoutAreaStage = templateHideoutArea.stages[nextLevel];
                if (templateHideoutAreaStage.constructionTime > 0) {
                    const currentTime = ~~(Date.now() / 1000);
                    characterHideoutArea.completeTime = ~~(currentTime + templateHideoutAreaStage.constructionTime);
                    characterHideoutArea.constructing = true;
                }

                //logger.logDebug(output);
                return output;
            } else {
                // How do return custom error to client!!1!1!!!111!elf?
                logger.logError(`[clientGameProfileHideoutUpgrade] Upgrading HideoutArea ${templateHideoutArea._id} for character ${playerProfile.character._id} failed. Unable to take required items.`);
                return;
            }
        }
    }

    static clientGameProfileHideoutUpgradeComplete = async (moveAction = null, _reply = null, playerProfile = null) => {
        if (playerProfile) {
            const templateHideoutArea = await HideoutArea.getBy("type", moveAction.areaType);
            const characterHideoutArea = await playerProfile.character.getHideoutAreaByType(moveAction.areaType);

            if (!templateHideoutArea) {
                logger.logError(`[clientGameProfileHideoutUpgradeComplete] Upgrading HideoutArea failed. Unknown hideout area ${moveAction.areaType} in hideoutArea database.`);
                return;
            }

            if (!characterHideoutArea) {
                logger.logError(`[clientGameProfileHideoutUpgradeComplete] Upgrading HideoutArea failed. Unknown hideout area ${moveAction.areaType} in character profile.`);
                return;
            }
            const nextLevel = characterHideoutArea.level + 1;
            const templateHideoutAreaStage = templateHideoutArea.stages[nextLevel];
            if (typeof templateHideoutAreaStage === "undefined") {
                logger.logError(`[clientGameProfileHideoutUpgradeComplete] Upgrading HideoutArea ${templateHideoutArea._id} for character ${playerProfile.character._id} failed. The level ${nextLevel} doesn't exist.`);
                return;
            }

            characterHideoutArea.level = nextLevel;
            characterHideoutArea.completeTime = 0;
            characterHideoutArea.constructing = false;

            const hideoutBonuses = templateHideoutAreaStage.bonuses;

            if (typeof hideoutBonuses !== "undefined" && hideoutBonuses.length > 0) {
                for (const hideoutBonus of hideoutBonuses) {
                    if (await playerProfile.character.applyHideoutBonus(hideoutBonus)) {

                    }
                }
            }
        }
    }

    static clientGameProfileHideoutPutItemsInAreaSlots = async (moveAction = null, _reply = null, playerProfile = null) => {
        const output = { items: { new: [], change: [], del: [] } };
        if (playerProfile) {
            const hideoutArea = await playerProfile.character.getHideoutAreaByType(moveAction.areaType);
            for (const itemPosition in moveAction.items) {
                logger.logDebug(moveAction.items);
                logger.logDebug(itemPosition);

                if (moveAction.items.hasOwnProperty(itemPosition)) {
                    const itemData = moveAction.items[itemPosition];
                    const item = await playerProfile.character.getInventoryItemByID(itemData.id);
                    const slotData = {
                        item: [
                            {
                                _id: item._id,
                                _tpl: item._tpl,
                                upd: item.upd
                            }
                        ]
                    };
                    hideoutArea.slots[itemPosition] = slotData;
                    await playerProfile.character.removeItem(item._id);
                    output.items.del.push(item);
                }
            }
        }
        return output;
    }

    static clientGameProfileHideoutTakeItemsFromAreaSlots = async (moveAction = null, _reply = null, playerProfile = null) => {
        const output = { items: { new: [], change: [], del: [] } };
        if (playerProfile) {
            const hideoutArea = await playerProfile.character.getHideoutAreaByType(moveAction.areaType);
            if (!hideoutArea) {
                logger.logError(`[clientGameProfileHideoutTakeItemsFromAreaSlots] Unable to find hideout area type ${moveAction.areaType} for playerProfile ${playerProfile.character._id}.`);
                return output;
            }

            for (const slot in moveAction.slots) {
                for (const item of hideoutArea.slots[slot].item) {
                    const itemAdded = await playerProfile.character.addItem(await playerProfile.character.getStashContainer(), item._tpl, false, 1);
                    if (itemAdded) {
                        output.items.new = [...output.items.new, ...itemAdded];
                        hideoutArea.slots.splice(slot, 1);
                    }
                }
            }
        }
        return output;
    }

    static clientGameProfileHideoutToggleArea = async (moveAction = null, _reply = null, playerProfile = null) => {
        if (playerProfile) {
            const hideoutArea = await playerProfile.character.getHideoutAreaByType(moveAction.areaType);
            if (!hideoutArea) {
                logger.logError(`[clientGameProfileHideoutToggleArea] Unable to find hideout area type ${moveAction.areaType} for playerProfile ${playerProfile.character._id}.`);
                return;
            }
            hideoutArea.active = moveAction.enabled;
        }
    }

    static clientGameProfileHideoutSingleProductionStart = async (moveAction = null, _reply = null, playerProfile = null) => {
        logger.logDebug(moveAction);
        if (playerProfile) {
            const hideoutProductionTemplate = await HideoutProduction.get(moveAction.recipeId);
            if (!hideoutProductionTemplate) {
                logger.logError(`[clientGameProfileHideoutSingleProductionStart] Starting hideout production failed. Unknown hideout production with Id ${moveAction.recipeId} in hideoutProduction database.`);
                return;
            }

            const output = {
                items: {
                    new: [],
                    change: [],
                    del: []
                }
            };

            let allItemsTaken = true;
            for (const itemToTake of moveAction.items) {
                const itemTaken = await playerProfile.character.removeItem(itemToTake.id, itemToTake.count);
                if (itemTaken) {
                    if (typeof itemTaken.changed !== "undefined") {
                        output.items.change = output.items.change.concat(itemTaken.changed);
                    }

                    if (typeof itemTaken.removed !== "undefined") {
                        output.items.del = output.items.del.concat(itemTaken.removed);
                    }
                } else {
                    allItemsTaken = false;
                }
                /*await trader.reduceStock(requestEntry.item_id, requestEntry.count);*/
            }

            if (allItemsTaken) {
                let productionTime = 0;

                if (typeof hideoutProductionTemplate.ProductionTime !== "undefined") {
                    productionTime = hideoutProductionTemplate.ProductionTime;
                } else if (typeof hideoutProductionTemplate.productionTime !== "undefined") {
                    productionTime = hideoutProductionTemplate.productionTime;
                }

                if(! hideoutProductionTemplate.count) {
                    hideoutProductionTemplate.count = 1;
                }

                const products = [{
                    _id: await generateUniqueId(),
                    _tpl: hideoutProductionTemplate.endProduct,
                    count: hideoutProductionTemplate.count
                }];

                playerProfile.character.Hideout.Production[hideoutProductionTemplate._id] = {
                    Progress: 0,
                    inProgress: true,
                    Products: products,
                    RecipeId: moveAction.recepieId,
                    SkipTime: 0,
                    ProductionTime: parseInt(productionTime),
                    StartTimestamp: getCurrentTimestamp()
                };

                return output;
            } else {
                // How do return custom error to client!!1!1!!!111!elf?
                logger.logError(`[clientGameProfileHideoutSingleProductionStart] Starting hideout production for recepie with Id ${moveAction.recipeId} failed. Unable to take required items.`);
                return;
            }
        }
    };

    static clientGameProfileHideoutContinuousProductionStart = async (moveAction = null, _reply = null, playerProfile = null) => {
        if (playerProfile) {
            const hideoutProductionTemplate = await HideoutProduction.get(moveAction.recipeId);
            if (!hideoutProductionTemplate) {
                logger.logError(`[clientGameProfileHideoutContinuousProductionStart] Couldn't start hideout production. Unknown production with Id ${moveAction.recipeId}`);
                return;
            }

            let productionTime = 0
            if (typeof hideoutProductionTemplate.ProductionTime !== "undefined") {
                productionTime = hideoutProductionTemplate.ProductionTime;
            } else if (typeof hideoutProductionTemplate.productionTime !== "undefined") {
                productionTime = hideoutProductionTemplate.productionTime;
            }

            playerProfile.character.Hideout.Production[hideoutProductionTemplate._id] = {
                Progress: 0,
                inProgress: true,
                RecipeId: moveAction.recipeId,
                SkipTime: 0,
                ProductionTime: parseInt(productionTime),
                StartTimestamp: getCurrentTimestamp()
            };
        }
    };

    static clientGameProfileAddNote = async (moveAction = null, _reply = null, playerProfile = null) => {
        if (playerProfile) {
            const playerPMC = await playerProfile.getPmc();
            logger.logConsole(moveAction);
            playerPMC.Notes.Notes.push(
                {
                    "Time": moveAction.note.Time,
                    "Text": moveAction.note.Text
                }
            );
            playerPMC.save();
        }
    };

    static clientGameProfileEditNote = async (moveAction = null, _reply = null, playerProfile = null) => {
        if (playerProfile) {
            logger.logConsole(moveAction);
            const playerPMC = await playerProfile.getPmc();
            playerPMC.Notes.Notes[moveAction.index] = {
                "Time": moveAction.note.Time,
                "Text": moveAction.note.Text
            };
            playerPMC.save();
        }
    };

    static clientGameProfileRemoveNote = async (moveAction = null, _reply = null, playerProfile = null) => {
        if (playerProfile) {
            logger.logConsole(moveAction);
            const playerPMC = await playerProfile.getPmc();
            //[Slejm] this can be done like playerPMC.Notes.Notes.Remove(moveAction.index); ?
            playerPMC.Notes.Notes.splice(moveAction.index, 1);
            playerPMC.save();
        }
    };

    static clientGameProfileResetWishList = async (moveAction = null, _reply = null, playerProfile = null) => {
        if (playerProfile) {
            logger.logConsole(moveAction);
            const playerPMC = await playerProfile.getPmc();
            playerPMC.WishList = [];
            playerPMC.save();
        }
    };

    static clientGameProfileHideoutScavCaseProductionStart = async (moveAction = null, _reply = null, playerProfile = null) => {
        const output = {
            items: {
                new: [],
                change: [],
                del: []
            }
        };
        if (playerProfile) {
            const hideoutScavcaseProduction = await HideoutScavcase.get(moveAction.recipeId);
            if (!hideoutScavcaseProduction) {
                logger.logError(`[clientGameProfileHideoutScavCaseProductionStart] Couldn't start scavcase. Unknown hideout scavcase with Id ${moveAction.recipeId}`);
            }
            const itemTaken = await playerProfile.character.removeItem(moveAction.items[0].id, moveAction.items[0].count);

            const products = await hideoutScavcaseProduction.generateRewards();

            /**
             * M4A1 TEST
             */
            //products.push({
            //    _id: await generateUniqueId(),
            //    _tpl: "5447a9cd4bdc2dbd208b4567"
            //});

            /**
             * Casque TEST
             */
            //products.push({
            //    _id: await generateUniqueId(),
            //    _tpl: "5b432b965acfc47a8774094e"
            //});
            if (itemTaken) {
                output.items.change = itemTaken.changed;
                output.items.removed = itemTaken.removed;
                playerProfile.character.Hideout.Production[hideoutScavcaseProduction._id] = {
                    Progress: 0,
                    inProgress: true,
                    RecipeId: moveAction.recipeId,
                    Products: products,
                    SkipTime: 0,
                    ProductionTime: parseInt(hideoutScavcaseProduction.ProductionTime),
                    StartTimestamp: getCurrentTimestamp()
                };
            } else {
                logger.logError(`[clientGameProfileHideoutScavCaseProductionStart] Couldn't take money with id ${moveAction.items[0].id}`);
            }
        }
        return output;
    };

    static clientGameProfileHideoutTakeProduction = async (moveAction = null, _reply = null, playerProfile = null) => {
        const output = {
            items: {
                new: [],
                change: [],
                del: []
            }
        };
        // TODO: HANDLE STACK FOR BULLETS & BULLETS PACKS
        if (playerProfile) {
            let itemsAdded;
            const production = await playerProfile.character.getHideoutProductionById(moveAction.recipeId);
            if (!production.hasOwnProperty("Products")) {
                logger.logError(`[clientGameProfileHideoutTakeProduction] Remanent productions error: no products for production with Id ${moveAction.recipeId}`);
                await playerProfile.character.removeHideoutProductionById(moveAction.recipeId);
                return output;
            }
            for (const product of production.Products) {
                if (!product.count) {
                    product.count = 1;
                }
                const itemTemplate = await Item.get(product._tpl);
                if (await Preset.itemHasPreset(itemTemplate._id)) {
                    const itemPresets = await Preset.getPresetsForItem(itemTemplate._id);
                    const itemPreset = Object.values(itemPresets).find(preset => preset._encyclopedia);
                    const basedChildren = await Item.prepareChildrenForAddItem(itemPreset._items[0], itemPreset._items);
                    itemsAdded = await playerProfile.character.addItem(await playerProfile.character.getStashContainer(), itemTemplate._id, basedChildren, product.count, true);
                } else {
                    itemsAdded = await playerProfile.character.addItem(await playerProfile.character.getStashContainer(), itemTemplate._id, undefined, product.count, true);
                }
                if (itemsAdded) {
                    output.items.new = output.items.new.concat(itemsAdded);
                }
            }
            await playerProfile.character.removeHideoutProductionById(moveAction.recipeId);
        }
        return output;
    };

    static clientGameProfileCustomizationBuy = async (moveAction = null, _reply = null, playerProfile = null) => {
        const output = {
            items: {
                new: [],
                change: [],
                del: []
            }
        };
        if (playerProfile) {
            if (moveAction.items.length > 0) {
                const itemTaken = await playerProfile.character.removeItem(moveAction.items[0].id, moveAction.items[0].count);
                if (!itemTaken) {
                    logger.logError(`[clientGameProfileCustomizationBuy] Couldn't take money with id ${moveAction.items[0].id}`);
                    return output;
                }
                output.items.change = itemTaken.changed;
                output.items.removed = itemTaken.removed;
            }
            await playerProfile.addCustomization(moveAction.offer);
            return output;
        }
    };

    static clientGameProfileCustomizationWear = async (moveAction = null, _reply = null, playerProfile = null) => {
        const output = {
            items: {
                new: [],
                change: [],
                del: []
            }
        };
        if (playerProfile) { 
            for (const suit of moveAction.suites) {
                const customizationSuit = await Customization.get(suit);
                await playerProfile.character.wearSuit(customizationSuit);
            }
        }
        return output;
    };
}
module.exports.GameController = GameController;
