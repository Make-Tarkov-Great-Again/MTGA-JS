//import { database } from '../../app.mjs';
import { Trader, Trade, Item, Inventory, Ragfair, Storage } from '../classes/_index.mjs';

import { logger } from "../utilities/_index.mjs";

export class TradeController {

    static async confirmTrade(moveAction, character, characterChanges) {
        switch (moveAction.Action) {
            case "TradingConfirm":
                switch (moveAction.type) {
                    case "buy_from_trader":
                        return this.buyFromTrader(moveAction, character, characterChanges);
                    case "sell_to_trader":
                        return this.sellToTrader(moveAction, character, characterChanges);
                    default:
                        return logger.error(`[confirmTrade/TradingConfirm] ${moveAction.type} is not handled`);
                }
            case "RagFairBuyOffer":
                return this.buyFromFlea(moveAction, character, characterChanges);
            case "CustomizationBuy":
                return this.buyCustomization(moveAction, character, characterChanges);
            default:
                if (moveAction.type)
                    return logger.error(`[confirmTrade] ${moveAction.Action} ${moveAction.type} is not handled!`);
                return logger.error(`[confirmTrade] ${moveAction.Action} is not handled!`);
        }
    }

    static async buyCustomization(moveAction, character, characterChanges) {
        const customizationSuit = await Trader.getCustomizationByTraderOfferId(moveAction.offer);

        if (moveAction.items.length > 0) {
            if (!await Inventory.removeItem(character.Inventory, characterChanges, moveAction.items[0].id, moveAction.items[0].count))
                return logger.error(`[customizationBuy] Couldn't take money with id ${moveAction.items[0].id}`);
            this.improveTraderTradeRelations(character, characterChanges, customizationSuit.traderID, moveAction.items[0].count)
        }

        Storage.addCustomization(character.aid, customizationSuit.suite._id);
    }

    static async buyFromTrader(moveAction, character, characterChanges) {
        const assort = Trader.getAssort(moveAction.tid);
        const purchase = await Trader.getAssortItemByID(assort, moveAction.item_id);

        const itemData = Item.get(purchase._tpl);

        //find existing stack to merge with before trying to create new item
        const newItemsToMerge = [];
        const amountToAdd = await this.mergeTradedItems(character.Inventory, itemData, moveAction.count, newItemsToMerge);
        if (amountToAdd === 0 && newItemsToMerge.length !== 0) {
            //purchase successfully merged, pay for it
            const receipt = await this.payForTraderTrade(character.Inventory, characterChanges, assort, moveAction);
            if (receipt !== 0) {
                characterChanges.items.change.push(...newItemsToMerge);
                this.improveTraderTradeRelations(character, characterChanges, moveAction.tid, receipt);
                return;
            }
            return logger.error(`[buyFromTrader/newItemsToMerge] Unable to add trader offer ${moveAction.item_id} because you're broke!!!!`);
        }

        const newItemsToAdd = [];
        newItemsToAdd.push(...await this.processPurchase(character, purchase, itemData, assort, moveAction.count));
        if (newItemsToAdd.length !== 0) {
            const receipt = await this.payForTraderTrade(character.Inventory, characterChanges, assort, moveAction);
            if (receipt !== 0) {
                characterChanges.items.new.push(...newItemsToAdd);
                this.improveTraderTradeRelations(character, characterChanges, moveAction.tid, receipt);
                return;
            }
            return logger.error(`[buyFromTrader/newItemsToAdd] Unable to add trader offer ${moveAction.item_id} because you're broke!!!!`);
        }
        return logger.error(`[buyFromTrader] Unable to add trader offer ${moveAction.item_id} because you're broke!!!!`);
    }

    static async payForTraderTrade(characterInventory, characterChanges, assort, moveAction) {
        let price = 0;
        for (const scheme of moveAction.scheme_items) { //moveAction.scheme_items (trader????) 
            if (!await Trade.typeOfPurchase(characterInventory, characterChanges, scheme.id, scheme.count)) {
                return logger.error("[buyFromTrader] Purchase failed because traded for item doesn't exist in your Inventory");
            }

            await Trader.removeItemFromAssortAfterBuy(assort, moveAction);
            const { offers } = Ragfair.get();
            const offer = await Ragfair.getOfferByItemId(moveAction.item_id, offers);
            if (offer && offer.buyRestrictionMax)
                offer.buyRestrictionCurrent += moveAction.count;

            price += scheme.count;
        }
        return price;
    }

    static improveTraderTradeRelations(character, characterChanges, traderId, salePrice) {
        character.TradersInfo[traderId].salesSum += salePrice
        const set = { salesSum: character.TradersInfo[traderId].salesSum };
        characterChanges.traderRelations[traderId] = set;
    }

    // probably can rename to `addPurchaseToInventory`    
    static async processPurchase(character, item, itemData, assort, amountPurchased) {
        const stashContainerID = await Inventory.getStashContainer(character.Inventory);
        const stashContainer = await Inventory.getInventoryItemByID(character.Inventory, stashContainerID);
        const children = await Item.getAllChildItemsInInventory(item, assort.items);

        return Inventory.addItemToInventory(
            character,
            stashContainer,
            item._id,
            itemData,
            amountPurchased,
            children
        );
    }

    /**
     * Checks if item can be merged into existing Item stacks in character Inventory, returns remainder
     * @param {*} characterInventory inventory of specified character
     * @param {*} itemData data of item received from Item.get(itemID)
     * @param {*} amountToMerge amount of items to merge
     * @param {*} itemsMerged array to return to client to know what was merged
     * @returns 
     */
    static async mergeTradedItems(characterInventory, itemData, amountToMerge, itemsMerged) {
        const maxStack = Item.getStackInfo(itemData);
        if (!maxStack)
            return amountToMerge;

        const existingStacks = await Inventory.getInventoryItemsByTpl(characterInventory, itemData._id);
        if (!existingStacks)
            return amountToMerge;

        return Inventory.addItemToStack(itemsMerged, existingStacks, maxStack, amountToMerge);
    }

    static async sellToTrader(moveAction, character, characterChanges) {
        for (const itemSelling of moveAction.items) {
            const item = await Inventory.getInventoryItemByID(character.Inventory, itemSelling.id);
            await Inventory.removeItem(character.Inventory, characterChanges, item._id, itemSelling.count);
        }

        // Merge existing item to reach max stack
        const currency = Item.get(Trader.getBaseCurrency(Trader.get(moveAction.tid)));

        const newItemsToMerge = [];
        const amountToAdd = await this.mergeTradedItems(character.Inventory, currency, moveAction.price, newItemsToMerge);
        if (amountToAdd === 0 && newItemsToMerge.length !== 0) {
            this.improveTraderTradeRelations(character, characterChanges, moveAction.tid, moveAction.price);
            characterChanges.items.new.push(...newItemsToMerge);
            return;
        }

        const newItemsToAdd = [];
        const stashContainer = await Inventory.getInventoryItemByID(character.Inventory, Inventory.getStashContainer(character.Inventory));
        newItemsToAdd.push(...await Inventory.addItemToInventory(character, stashContainer, currency._id, currency, amountToAdd));

        if (newItemsToAdd.length !== 0) {
            characterChanges.items.new.push(...newItemsToAdd)
            this.improveTraderTradeRelations(character, characterChanges, moveAction.tid, moveAction.price);
        }
    }

    static async buyFromFlea(moveAction, character, characterChanges) {
        for (const offer of moveAction.offers) {
            const listedOffer = await Ragfair.getOfferById(offer.id);
            const itemData = Item.get(listedOffer.items[0]._tpl);

            const newItemsToMerge = [];
            const amountToAdd = await this.mergeTradedItems(character.Inventory, itemData, offer.count, newItemsToMerge);
            if (amountToAdd === 0 && newItemsToMerge.length !== 0) {
                //purchase successfully merged, pay for it
                const receipt = await this.payForFleaTrade(character.Inventory, characterChanges, offer, listedOffer);
                if (receipt !== 0) {
                    characterChanges.items.change.push(...newItemsToMerge);
                    continue;
                }
                return logger.error(`[buyFromFlea/newItemsToMerge] Unable to add trader offer ${offer.id} because you're broke!!!!`);
            }

            const newItemsToAdd = [];
            newItemsToAdd.push(...await this.processPurchase(character, listedOffer.items[0], itemData, offer, amountToAdd));
            if (newItemsToAdd.length !== 0) {
                const receipt = await this.payForFleaTrade(character, characterChanges, offer, listedOffer);
                if (receipt !== 0) {
                    characterChanges.items.new.push(...newItemsToAdd);
                    continue;
                }
                return logger.error(`[buyFromFlea/newItemsToAdd] Unable to add trader offer ${offer.id} because you're broke!!!!`)
            }

            return logger.error(`[buyFromFlea/newItemsToAdd] Unable to add trader offer ${offer.id} because you're broke!!!!`);
        }
    }

    static async payForFleaTrade(character, characterChanges, offer, listedOffer) {
        let price = 0;
        for (const scheme of offer.items) { //payTrade function needs to be modified for this
            if (!await Trade.typeOfPurchase(character.Inventory, characterChanges, scheme.id, scheme.count)) {
                return logger.error("[buyFromFlea] Purchase failed because traded for item doesn't exist in your Inventory");
            }
            if (listedOffer.isTraderOffer()) {
                if (listedOffer.buyRestrictionMax) {
                    listedOffer.buyRestrictionCurrent += offer.count;
                    await Trader.removeItemFromAssortAfterBuy(
                        Trader.getAssort(listedOffer.user.id),
                        { item_id: listedOffer.root, count: offer.count }
                    );
                }
                this.improveTraderTradeRelations(character, characterChanges, listedOffer.user.id, scheme.count)
            }
            price += scheme.count
        }
        return price;
    }
}
