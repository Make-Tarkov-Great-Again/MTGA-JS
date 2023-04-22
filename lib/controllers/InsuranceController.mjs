import { Character, Inventory, Item, Trade, Trader, Response } from "../classes/_index.mjs";


export class InsuranceController {

    static async insuranceCost(request, reply) {
        const character = Character.get(Response.getSessionID(request));

        const output = {};
        for (const traderID of request.body.traders) {
            const traderItems = {};

            for (const key of request.body.items) {
                const item = Inventory.getInventoryItemByID(character.Inventory, key);
                const insurance = this.getPremium(traderID, character, item._tpl);
                traderItems[item._tpl] = insurance; //item tpl as key for client to read totals
            }

            output[traderID] = traderItems;
        }

        return Response.zlibJsonReply(
            reply,
            Response.applyBody(output));
    }

    static async insureItems(moveAction, character, characterChanges) {
        const { currency } = Trader.getBase(moveAction.tid);
        const acceptedCurrency = {
            RUB: "5449016a4bdc2d6f028b456f",
            USD: "5696686a4bdc2da3298b456a",
            EUR: "569668774bdc2da2298b4568"
        }[currency];

        for (const key of moveAction.items) {
            const item = Inventory.getInventoryItemByID(character.Inventory, key);

            await Trade.tradeMoney(
                character.Inventory,
                characterChanges,
                acceptedCurrency,
                this.getPremium(moveAction.tid, character, item._tpl)
            );

            character.InsuredItems.push({
                "tid": moveAction.tid,
                "itemId": key
            });
        }
    }

    static getPremium(traderID, character, itemTPL) {
        const { loyaltyLevels } = Trader.getBase(traderID);
        const loyaltyLevel = Character.getLoyalty(character, traderID);
        const { insurance_price_coef } = loyaltyLevels[loyaltyLevel];
        const coef = insurance_price_coef / 100;
        return Math.round((coef * Item.getItemPrice(itemTPL)) * coef);
    }
}
