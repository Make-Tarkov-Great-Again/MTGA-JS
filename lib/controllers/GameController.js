const { database } = require("../../app");
const { Profile } = require('../models/Profile');
const { Language } = require('../models/Language');
const { Account } = require('../models/Account');
const { Customization } = require('../models/Customization');
const { Quest } = require('../models/Quest');
const { Locale } = require('../models/Locale');
const { Trader } = require('../models/Trader');
const { Item } = require('../models/Item');
const { RagfairOffer } = require('../models/RagfairOffer');
const { Ragfair } = require('../models/Ragfair');
const { getCurrentTimestamp, logger, FastifyResponse, generateMongoID } = require("../../utilities");


class GameController {
    // JET Basics //
    static async modeOfflinePatches(_request = null, reply = null) {
        return FastifyResponse.zlibJsonReply(reply, database.core.serverConfig.Patches);
    }

    static async modeOfflinePatchNodes(_request = null, reply = null) {
        return FastifyResponse.zlibJsonReply(reply, database.core.serverConfig.PatchNodes);
    }

    // Game //

    static async clientGameStart(request = null, reply = null) {
        const playerProfile = Profile.get(await FastifyResponse.getSessionID(request));
        if (playerProfile) {
            return FastifyResponse.zlibJsonReply(
                reply,
                FastifyResponse.applyBody({ utc_time: await getCurrentTimestamp() }, 0, null));
        } else {
            return FastifyResponse.zlibJsonReply(
                reply,
                FastifyResponse.applyBody({ utc_time: await getCurrentTimestamp() }, 999, "Profile Not Found!!"));
        }
    }

    static async clientGameVersionValidate(request = null, reply = null) {
        logger.logInfo("Client connected with version: " + request.body.version.major);
        return FastifyResponse.zlibJsonReply
            (
                reply,
                FastifyResponse.applyBody(null)
            );
    }

    static async clientGameConfig(request = null, reply = null) {
        const sessionID = await FastifyResponse.getSessionID(request);
        const responseObject = {
            aid: sessionID,
            lang: "en",
            languages: await Language.getAllWithoutKeys(),
            ndaFree: false,
            taxonomy: 6,
            activeProfileId: `pmc${sessionID}`,
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
    }

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
    }

    // TODO: QuestController
    static async clientGameProfileAcceptQuest(moveAction = null, _reply = null, playerProfile = null) {
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
    }

    // TODO: TradingController
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
                }
            } else {
                logger.logError(`[clientGameProfileTradingConfirm] Unable to add items`);
            }

            logger.logDebug(output);
            logger.logDebug(output.items);
            logger.logDebug(output.items.change[0].upd);
        } else {
            logger.logError(`[clientGameProfileTradingConfirm] My brother in christ what are you trying to do ? ${moveAction.type} ? That shit is not done lmao pay me now.`);
        }
        return output;
    }

    static async clientGameProfileReadEncyclopedia(moveAction = null, _reply = null, playerProfile = null) {
        if (playerProfile) {
            for (const id of moveAction.ids) {
                playerProfile.character.Encyclopedia[id] = true;
            }
        }
    }

    // TODO: NoteController
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
    }

    // TODO: NoteController
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
    }

    // TODO: NoteController
    static async clientGameProfileRemoveNote(moveAction = null, _reply = null, playerProfile = null) {
        if (playerProfile) {
            logger.logConsole(moveAction);
            const playerPMC = await playerProfile.getPmc();
            delete playerPMC.Notes.Notes[moveAction.index];
            await playerPMC.save();
        }
    }

    static async clientGameProfileResetWishList(moveAction = null, _reply = null, playerProfile = null) {
        if (playerProfile) {
            logger.logConsole(moveAction);
            const playerPMC = await playerProfile.getPmc();
            playerPMC.WishList = [];
            await playerPMC.save();
        }
    }

    // TODO: CustomizationController
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
            const customizationSuit = await Customization.getCustomizationByTraderOfferId(moveAction.offer);
            await playerProfile.addCustomization(customizationSuit._id);
        }
        return output;
    }

    // TODO: CustomizationController
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
    }

    // TODO: TraderController
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
                    break;
                }
            }
            // new max durability
            const amountRepaired = Math.round(Math.min(Math.max(itemToRepair.upd.Repairable.Durability + moveAction.repairItems[0].count, 0), itemToRepair.upd.Repairable.MaxDurability));
            itemToRepair.upd.Repairable.Durability = amountRepaired;
            itemToRepair.upd.Repairable.MaxDurability = amountRepaired;
            output.items.change.push(itemToRepair);
        }
        return output;
    }

    // TODO: PresetController
    static async clientGameSaveBuildPreset(moveAction = null, _reply = null, playerProfile = null) {
        const playerStorage = await playerProfile.getStorage();

        playerStorage.builds[moveAction.name] = {
            "id": await generateMongoID(),
            "name": moveAction.name,
            "root": await generateMongoID(),
            "items": moveAction.items
        }

        await playerProfile.saveStorage();
    }

    // TODO: PresetController
    static async clientGameRemoveBuildPreset(moveAction = null, _reply = null, playerProfile = null) {
        const playerStorage = await playerProfile.getStorage();
        delete playerStorage.builds[moveAction.name];
        await playerProfile.saveStorage();
    }
}
module.exports.GameController = GameController;
