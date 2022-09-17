const { Trader } = require('../models/Trader');
const { Account } = require('../models/Account');
const { Item } = require('../models/Item');
const { Ragfair } = require('../models/Ragfair');
const { RagfairOffer } = require('../models/RagfairOffer');
const { FastifyResponse, logger, round, min, max } = require("../../utilities");


class TraderController {

    static async clientTradingApiGetTradersInfo(_request = null, reply = null) {
        const traders = Object.values(await Trader.getAll())
            .reduce((output, trader) => {
                if (!trader.isRagfair()) {
                    output.push(trader.base);
                }
                return output;
            }, []);

        return FastifyResponse.zlibJsonReply(reply, FastifyResponse.applyBody(traders));
    }

    static async clientTradingCustomizationStorage(request = null, reply = null) {
        const playerAccount = await Account.get(await FastifyResponse.getSessionID(request));
        const profile = await playerAccount.getProfile();
        const storageData = await profile.getStorage();
        return FastifyResponse.zlibJsonReply(reply, FastifyResponse.applyBody(storageData));
    }

    static async getTraderAssort(request = null, reply = null) {
        const playerAccount = await Account.get(await FastifyResponse.getSessionID(request));
        const profile = await playerAccount.getProfile();
        const trader = await Trader.get(request.params.traderId);
        const res = await trader.generateFilteredAssort(profile);
        return FastifyResponse.zlibJsonReply(reply, FastifyResponse.applyBody(res));
    }

    static async getTraderOutfitOffers(request = null, reply = null) {
        const trader = await Trader.get(request.params.id);
        logger.info(`Shows outfits for all sides, we'll decide if we care or not`);
        return FastifyResponse.zlibJsonReply(reply, FastifyResponse.applyBody(trader.suits));
    }

    static async getUserAssortPrice(request = null, reply = null) {
        const playerAccount = await Account.get(await FastifyResponse.getSessionID(request));
        const profile = await playerAccount.getProfile();
        const trader = await Trader.get(request.params.traderId);
        return FastifyResponse.zlibJsonReply(reply, FastifyResponse.applyBody(await trader.getPurchasesData(profile)));
    }

    static async traderRepair(moveAction = null, _reply = null, playerProfile = null) {
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
                logger.error(`[traderRepair] Couldn't find item with id ${moveAction.item}`);
                return output;
            }
            const trader = await Trader.get(moveAction.tid);
            const loyalty = await playerProfile.getLoyalty(trader.base._id);
            const itemTemplate = await Item.get(itemToRepair._tpl);
            const coef = 1 + ((trader.base.loyaltyLevels[loyalty].repair_price_coef) / 100);
            let repairCost = await round(itemTemplate._props.RepairCost * moveAction.repairItems[0].count * coef);
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
            const amountRepaired = await round(min(max(itemToRepair.upd.Repairable.Durability + moveAction.repairItems[0].count, 0), itemToRepair.upd.Repairable.MaxDurability));
            itemToRepair.upd.Repairable.Durability = amountRepaired;
            itemToRepair.upd.Repairable.MaxDurability = amountRepaired;
            output.items.change.push(itemToRepair);
        }
        return output;
    }

    static async tradingConfirm(moveAction = null, _reply = null, playerProfile = null) {
        const { database: { templates: { priceTable } } } = require("../../app");
        logger.debug(`[tradingConfirm] ` + moveAction);
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
            const traderAssort = await trader.generateFilteredAssort(playerProfile);
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
                        for (const stackedSlot of traderItemTemplate._props.StackSlots) {
                            const childToAdd = {
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
                        logger.error(`[clientGameProfileTradingConfirm] Unable to take items`);
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
                logger.debug(`[clientGameProfileTradingConfirm] Unable to add items`);
            }
            logger.debug(output);
            logger.debug(output.items);
            logger.debug(output.items.change[0].upd);
        } else if (moveAction.type === 'sell_to_trader') {
            const trader = await Trader.get(moveAction.tid);
            // TODO: LOAD TRADER PLAYER LOYALTY FOR COEF
            let itemPrice = 0;
            for (const itemSelling of moveAction.items) {
                logger.debug(itemSelling);
                const item = await playerProfile.character.getInventoryItemByID(itemSelling.id);
                const currentItemPrice = priceTable[item._tpl];
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
            logger.debug(output);
            logger.debug(output.items.change);
            logger.debug(output.items.new);

        } else if (moveAction.Action === 'RagFairBuyOffer') {
            for (const actionOffer of moveAction.offers) {
                const ragfair = await Ragfair.get("FleaMarket");
                const ragfairOffer = await RagfairOffer.getById(actionOffer.id, ragfair.offers);
                const itemTemplate = await Item.get(ragfairOffer.items[0]._tpl);

                let preparedChildren = false;
                if (ragfairOffer.items.length > 0) {
                    preparedChildren = await Item.prepareChildrenForAddItem(ragfairOffer.items[0], ragfairOffer.items);
                }

                // Merge existing item to reach max stack
                let itemsAdded;
                let itemsMerged;
                let remainingStack = actionOffer.count;
                const maxStack = await itemTemplate.getStackInfo();
                if (maxStack) {
                    const existingStacks = await playerProfile.character.getInventoryItemsByTpl(itemTemplate._id);

                    [itemsMerged, remainingStack] = await playerProfile.character.addItemToStack(
                        existingStacks,
                        maxStack,
                        actionOffer.count
                    );
                }
                if (remainingStack) {
                    itemsAdded = await playerProfile.character.addItem(
                        await playerProfile.character.getStashContainer(),
                        ragfairOffer.items[0]._tpl,
                        preparedChildren,
                        remainingStack
                    );
                }
                if (itemsAdded || itemsMerged) {
                    if (itemsAdded) {
                        output.items.new.push(...itemsAdded);
                    }
                    if (itemsMerged) {
                        output.items.change.push(...itemsMerged);
                    }
                    for (const scheme of actionOffer.items) {
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
                            logger.error(`[clientGameProfileTradingConfirm] Unable to take items`);
                        }
                        if (await ragfairOffer.isTraderOffer()) {
                            if (ragfairOffer.buyRestrictionMax) {
                                ragfairOffer.buyRestrictionCurrent += actionOffer.count;
                                const trader = await Trader.get(ragfairOffer.user.id);
                                await trader.removeItemFromAssortAfterBuy({ item_id: ragfairOffer.root, count: actionOffer.count });
                            }
                        }
                    }
                }
                else {
                    logger.error(`[clientGameProfileTradingConfirm] Unable to add item(s)`);
                }
            }

            //logger.debug(output);
            //logger.debug(output.items);
            //logger.debug(output.items.change[0].upd);
        } else {
            logger.error(`[clientGameProfileTradingConfirm] My brother in christ what are you trying to do ? ${moveAction.type} ? That shit is not done lmao pay me now.`);
        }
        return output;
    }

}
module.exports.TraderController = TraderController;
