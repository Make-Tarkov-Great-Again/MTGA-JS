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
const { RagfairOffer } = require('../models/RagfairOffer');
const { Ragfair } = require('../models/Ragfair');
const { generateUniqueId, getCurrentTimestamp, logger, FastifyResponse, readParsed, generateMongoID } = require("../../utilities");


class GameController {
    // JET Basics //
    static async modeOfflinePatches(_request = null, reply = null) {
        return FastifyResponse.zlibJsonReply(reply, database.core.serverConfig.Patches);
    };

    static async modeOfflinePatchNodes(_request = null, reply = null) {
        return FastifyResponse.zlibJsonReply(reply, database.core.serverConfig.PatchNodes);
    };

    // Game //

    static async clientGameStart(request = null, reply = null) {
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

    static async clientGameVersionValidate(request = null, reply = null) {
        logger.logInfo("Client connected with version: " + request.body.version.major);
        return FastifyResponse.zlibJsonReply
            (
                reply,
                FastifyResponse.applyBody(null)
            );
    };

    static async clientGameConfig(request = null, reply = null) {
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
            utc_time: await getCurrentTimestamp(),
            totalInGame: 0,
            reportAvailable: true,
            twitchEventMember: false
        };

        return FastifyResponse.zlibJsonReply
            (
                reply,
                FastifyResponse.applyBody(responseObject)
            );
    };

    static async clientGameKeepAlive(request = null, reply = null) {
        let msg = "OK";

        const sessionID = await FastifyResponse.getSessionID(request);
        if (typeof sessionID == "undefined") msg = "No Session";

        // traders assorts
        const traders = await Trader.getAllWithoutKeys();
        const currentTime = await getCurrentTimestamp();
        for (const trader of traders) {
            await trader.generateAssort(currentTime);
        }

        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody({ msg: msg, utc_time: await getCurrentTimestamp() })
        );
    };

    static async clientProfileList(request = null, reply = null) {
        const output = [];

        // Implement with offline raiding //
        const playerScav = readParsed("./database/bot/playerScav.json");
        playerScav.RegistrationDate = await getCurrentTimestamp();
        playerScav.aid = await FastifyResponse.getSessionID(request); // AIDs need to be the same

        const playerAccount = await Account.get(await FastifyResponse.getSessionID(request));
        if (!playerAccount.wipe) {
            const profile = await playerAccount.getProfile();
            if (profile.character.length !== 0) {

                /* Generate scav and assign */
                //output.push(await profile.getScav());
                output.push(playerScav);


                const character = await profile.getPmc();
                const pmc = await character.dissolve();
                pmc.savage = playerScav._id; //set pmc.savage var to scav id

                output.push(pmc);
            }
        }
        //logger.logConsole(output);
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(output)
        );
    };

    static async clientProfileSelect(request, reply) {
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

    static async clientGameProfileNicknameReserved(_request = null, reply = null) {
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody("")
        );
    };

    static async clientGameProfileNicknameValidate(request = null, reply = null) {
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

    static async clientGameProfileCreate(request = null, reply = null) {
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
        const newID = await generateMongoID();
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

    static async clientGameProfileVoiceChange(request = null, reply = null) {
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

    static async clientGameProfileNicknameChange(request = null, reply = null) {
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

    static async clientGameProfileAcceptQuest(moveAction = null, reply = null, playerProfile = null) {
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

    static async clientGameProfileMoveItem(moveAction = null, reply = null, playerProfile = null) {
        logger.logDebug("Move request:");
        logger.logDebug(moveAction);

        const movedItems = await playerProfile.character.moveItems(moveAction);
        if (movedItems) {
            return {};
        } else {
            // display error
        }
    };

    static async clientGameProfileExamine(moveAction = null, reply = null, playerProfile = null) {
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
                    const ragfair = await Ragfair.get("FleaMarket");
                    const ragfairOffers = ragfair.offers;
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

    static async clientGameProfileTradingConfirm(moveAction = null, _reply = null, playerProfile = null) {
        logger.logDebug("[clientGameProfileTradingConfirm] Trading request:");
        logger.logDebug(moveAction);
        const output = {
            items: {
                new: [],
                change: [],
                del: []
            }
        };
        if (moveAction.type === 'buy_from_trader') {
            const trader = await Trader.get(moveAction.tid);
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
                    await trader.removeItemFromAssortAfterBuy(moveAction);
                    const ragfair = await Ragfair.get("FleaMarket");
                    const ragfairOffer = await RagfairOffer.getOfferByItemId(moveAction.item_id, ragfair.offers);
                    if (ragfairOffer) {
                        if (ragfairOffer.buyRestrictionMax) {
                            ragfairOffer.buyRestrictionCurrent += moveAction.count;
                        }
                    }
                }
            } else {
                logger.logDebug(`[clientGameProfileTradingConfirm] Unable to add items`);
            }
            logger.logDebug(output);
            logger.logDebug(output.items);
            logger.logDebug(output.items.change[0].upd);
        } else if (moveAction.type === 'sell_to_trader') {
            const trader = await Trader.get(moveAction.tid);
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
            const ragfair = await Ragfair.get("FleaMarket");
            const offer = await RagfairOffer.getById(moveAction.offers[0].id, ragfair.offers);
            const itemTemplate = await Item.get(offer.items[0]._tpl);

            //const unpreparedChildren = await Item.getAllChildItemsInInventory(item.items);
            let preparedChildren = false;
            if (offer.items.length > 0) {
                preparedChildren = await Item.prepareChildrenForAddItem(offer.items[0], offer.items);
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
            }
            if (remainingStack) {
                itemsAdded = await playerProfile.character.addItem(
                    await playerProfile.character.getStashContainer(),
                    offer.items[0]._tpl,
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
                    if (await offer.isTraderOffer()) {
                        if (offer.buyRestrictionMax) {
                            offer.buyRestrictionCurrent += moveAction.offers[0].count;
                            const trader = await Trader.get(offer.user.id);
                            await trader.removeItemFromAssortAfterBuy({item_id: offer.root, count: moveAction.offers[0].count});
                        }
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

    static async clientGameProfileSplitItem(moveAction = null, _reply = null, playerProfile = null) {
        const splittedItems = await playerProfile.character.splitItems(moveAction);
        if (splittedItems) {
            return {
                items: { new: [splittedItems] }
            };
        }
    };

    static async clientGameProfileMergeItem(moveAction = null, _reply = null, playerProfile = null) {
        const mergedItems = await playerProfile.character.mergeItems(moveAction);
        if (mergedItems) {
            return {
                items: { del: [mergedItems] }
            };
        }
    };

    static async clientGameProfileRemoveItem(moveAction = null, _reply = null, playerProfile = null) {
        const deletedItems = await playerProfile.character.removeItems(moveAction);
        if (deletedItems) {
            return {
                items: { del: [deletedItems] }
            };
        }
    };

    static async clientGameProfileFoldItem(moveAction = null, _reply = null, playerProfile = null) {
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

    static async clientGameProfileTagItem(moveAction = null, _reply = null, playerProfile = null) {
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

    static async clientGameProfileToggleItem(moveAction = null, _reply = null, playerProfile = null) {
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

    static async clientGameProfileBindItem(moveAction = null, _reply = null, playerProfile = null) {
        if (playerProfile) {
            for (const index in playerProfile.character.Inventory.fastPanel) {
                if (playerProfile.character.Inventory.fastPanel[index] === moveAction.item) {
                    playerProfile.character.Inventory.fastPanel[index] = "";
                }
            }
            playerProfile.character.Inventory.fastPanel[moveAction.index] = moveAction.item;
        }
    };

    static async clientGameProfileReadEncyclopedia(moveAction = null, _reply = null, playerProfile = null) {
        if (playerProfile) {
            for (const id of moveAction.ids) {
                playerProfile.character.Encyclopedia[id] = true;
            }
        }
    };

    static async clientGameProfileHideoutUpgrade(moveAction = null, _reply = null, playerProfile = null) {
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

    static async clientGameProfileHideoutUpgradeComplete(moveAction = null, _reply = null, playerProfile = null) {
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

    static async clientGameProfileHideoutPutItemsInAreaSlots(moveAction = null, _reply = null, playerProfile = null) {
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

    static async clientGameProfileHideoutTakeItemsFromAreaSlots(moveAction = null, _reply = null, playerProfile = null) {
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

    static async clientGameProfileHideoutToggleArea(moveAction = null, _reply = null, playerProfile = null) {
        if (playerProfile) {
            const hideoutArea = await playerProfile.character.getHideoutAreaByType(moveAction.areaType);
            if (!hideoutArea) {
                logger.logError(`[clientGameProfileHideoutToggleArea] Unable to find hideout area type ${moveAction.areaType} for playerProfile ${playerProfile.character._id}.`);
                return;
            }
            hideoutArea.active = moveAction.enabled;
        }
    }

    static async clientGameProfileHideoutSingleProductionStart(moveAction = null, _reply = null, playerProfile = null) {
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

                if (!hideoutProductionTemplate.count) {
                    hideoutProductionTemplate.count = 1;
                }

                const products = [{
                    _id: await generateMongoID(),
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
                    StartTimestamp: await getCurrentTimestamp()
                };

                return output;
            } else {
                // How do return custom error to client!!1!1!!!111!elf?
                logger.logError(`[clientGameProfileHideoutSingleProductionStart] Starting hideout production for recepie with Id ${moveAction.recipeId} failed. Unable to take required items.`);
                return;
            }
        }
    };

    static async clientGameProfileHideoutContinuousProductionStart(moveAction = null, _reply = null, playerProfile = null) {
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
                StartTimestamp: await getCurrentTimestamp()
            };
        }
    };

    static async clientGameProfileAddNote(moveAction = null, _reply = null, playerProfile = null) {
        if (playerProfile) {
            const playerPMC = await playerProfile.getPmc();
            logger.logConsole(moveAction);
            playerPMC.Notes.Notes.push(
                {
                    "Time": moveAction.note.Time,
                    "Text": moveAction.note.Text
                }
            );
            await playerPMC.save();
        }
    };

    static async clientGameProfileEditNote(moveAction = null, _reply = null, playerProfile = null) {
        if (playerProfile) {
            logger.logConsole(moveAction);
            const playerPMC = await playerProfile.getPmc();
            playerPMC.Notes.Notes[moveAction.index] = {
                "Time": moveAction.note.Time,
                "Text": moveAction.note.Text
            };
            await playerPMC.save();
        }
    };

    static async clientGameProfileRemoveNote(moveAction = null, _reply = null, playerProfile = null) {
        if (playerProfile) {
            logger.logConsole(moveAction);
            const playerPMC = await playerProfile.getPmc();
            //[Slejm] this can be done like playerPMC.Notes.Notes.Remove(moveAction.index); ?
            playerPMC.Notes.Notes.splice(moveAction.index, 1);
            await playerPMC.save();
        }
    };

    static async clientGameProfileResetWishList(moveAction = null, _reply = null, playerProfile = null) {
        if (playerProfile) {
            logger.logConsole(moveAction);
            const playerPMC = await playerProfile.getPmc();
            playerPMC.WishList = [];
            await playerPMC.save();
        }
    };

    static async clientGameProfileHideoutScavCaseProductionStart(moveAction = null, _reply = null, playerProfile = null) {
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
            //    _id: await generateMongoID(),
            //    _tpl: "5447a9cd4bdc2dbd208b4567"
            //});

            /**
             * Casque TEST
             */
            //products.push({
            //    _id: await generateMongoID(),
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
                    StartTimestamp: await getCurrentTimestamp()
                };
            } else {
                logger.logError(`[clientGameProfileHideoutScavCaseProductionStart] Couldn't take money with id ${moveAction.items[0].id}`);
            }
        }
        return output;
    };

    static async clientGameProfileHideoutTakeProduction(moveAction = null, _reply = null, playerProfile = null) {
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

    static async clientGameProfileCustomizationBuy(moveAction = null, _reply = null, playerProfile = null) {
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
            const suiteId = await Customization.findSuiteInTraderOffers(moveAction.offer);
            await playerProfile.addCustomization(suiteId);
            return output;
        }
    };

    static async clientGameProfileCustomizationWear(moveAction = null, _reply = null, playerProfile = null) {
        const output = {
            items: {
                new: [],
                change: [],
                del: []
            }
        };
        // not sure if anything is  needed in output, working so far
        if (playerProfile) {
            for (const suit of moveAction.suites) {
                const customizationSuit = await Customization.get(suit);
                await playerProfile.character.wearSuit(customizationSuit);
            }
        }
        return output;
    };

    /**
     * Pay therapist and update player limbs health
     * @param {*} moveAction 
     * @param {*} _reply 
     * @param {*} playerProfile 
     * @returns 
     */
    static async clientGameProfileRestoreHealth(moveAction = null, _reply = null, playerProfile = null) {
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
                    logger.logError(`[clientGameProfileTraderRestoreHealth] Couldn't take money with id ${moveAction.items[0].id}`);
                    return output;
                }
                output.items.change = itemTaken.changed;
                output.items.del = itemTaken.removed;
            }

            for (const bodyPart in moveAction.difference.BodyParts) {
                await playerProfile.character.addHealthToBodyPart(bodyPart, moveAction.difference.BodyParts[bodyPart].Health);
            }
        }
        return output;
    }

    /**
     * Consume x of healh item and update player limbs health
     * @param {*} moveAction
     * @param {*} _reply
     * @param {*} playerProfile
     */
    static async clientGameProfileHeal(moveAction = null, _reply = null, playerProfile = null) {
        const output = {
            items: {
                new: [],
                change: [],
                del: []
            }
        };
        if (playerProfile) {
            const medItem = await playerProfile.character.getInventoryItemByID(moveAction.item);
            if (!medItem) {
                logger.logError(`[clientGameProfilePlayerRestoreHealth] Couldn't find item with id ${moveAction.item}`);
                return output;
            }
            if (medItem.upd && medItem.upd.MedKit) {
                medItem.upd.MedKit.HpResource -= moveAction.count;
            } else {
                medItem.MedKit = 0;
            }
            if (medItem.upd && medItem.upd.MedKit.HpResource <= 0) {
                const itemTaken = await playerProfile.character.removeItem(medItem._id);
                output.items.del.push(...itemTaken.removed);
                output.items.change.push(...itemTaken.changed);
            } else {
                output.items.change.push(medItem);
            }
            await playerProfile.character.addHealthToBodyPart(moveAction.part, moveAction.count);
        }
        return output;
    }

    static async clientGameProfileEat(moveAction = null, _reply = null, playerProfile = null) {
        const output = {
            items: {
                new: [],
                change: [],
                del: []
            }
        };
        if (playerProfile) {
            const foodItem = await playerProfile.character.getInventoryItemByID(moveAction.item);
            if (!foodItem) {
                logger.logError(`[clientGameProfilePlayerEat] Couldn't find item with id ${moveAction.item}`);
                return output;
            }
            if (foodItem.upd && foodItem.upd.FoodDrink && foodItem.upd.FoodDrink.HpPercent) {
                foodItem.upd.FoodDrink.HpPercent -= moveAction.count;
            }
            if (!foodItem.upd.FoodDrink.HpPercent || foodItem.upd.FoodDrink.HpPercent <= 0) {
                const itemTaken = await playerProfile.character.removeItem(foodItem._id);
                output.items.del.push(...itemTaken.removed);
                output.items.change.push(...itemTaken.changed);
            } else {
                output.items.change.push(foodItem);
            }
        }
        return output;
    }

    static async clientGameTraderRepair(moveAction = null, _reply = null, playerProfile = null) {
        const output = {
            items: {
                new: [],
                change: [],
                del: []
            }
        };
        if (playerProfile) {
            const itemToRepair = await playerProfile.character.getInventoryItemByID(moveAction.repairItems[0]._id);
            if (!itemToRepair) {
                logger.logError(`[clientGameTraderRepair] Couldn't find item with id ${moveAction.item}`);
                return output;
            }
            const trader = await Trader.get(moveAction.tid);
            const loyalty = await playerProfile.getLoyalty(trader.base._id, trader.base);
            const itemTemplate = await Item.get(itemToRepair._tpl);
            const coef = 1 + ((trader.base.loyaltyLevels[loyalty].repair_price_coef) / 100);
            let repairCost = Math.round(itemTemplate._props.RepairCost * moveAction.repairItems[0].count * coef);
            const moneyItems = await playerProfile.character.getInventoryItemsByTpl(trader.base.repair.currency);
            for (const moneyStack of moneyItems) {
                if (moneyStack.upd.StackObjectsCount < repairCost) {
                    const itemTaken = await playerProfile.character.removeItem(moneyStack._id, repairCost);
                    output.items.del.push(...itemTaken.removed);
                    output.items.change.push(...itemTaken.changed);
                    repairCost -= moneyStack.upd.StackObjectsCount;
                } else {
                    const itemTaken = await playerProfile.character.removeItem(moneyStack._id, repairCost);
                    output.items.del.push(...itemTaken.removed);
                    output.items.change.push(...itemTaken.changed);
                    break
                }
            }
            // new max durability
            const amountRepaired = Math.min(Math.max(itemToRepair.upd.Repairable.Durability + moveAction.repairItems[0].count, 0), itemToRepair.upd.Repairable.MaxDurability) 
            itemToRepair.upd.Repairable.Durability = amountRepaired;
            itemToRepair.upd.Repairable.MaxDurability = amountRepaired;
            output.items.change.push(itemToRepair);
        }
        return output;
    }
}
module.exports.GameController = GameController;
