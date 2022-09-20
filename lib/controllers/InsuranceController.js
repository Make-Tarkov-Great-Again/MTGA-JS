const { Trader } = require("../models/Trader")
const { Profile } = require("../models/Profile")
const { logger, FastifyResponse, payTrade, round } = require("../../utilities")
const { Item } = require("../models/Item")

class InsuranceController {

    static async insuranceCost(request, reply) {
        const playerProfile = await Profile.get(await FastifyResponse.getSessionID(request));
        const inventory = await playerProfile.getInventoryItems();

        const output = {};

        for (const traderID of request.body.traders) {
            const traderItems = {};

            for (const key of request.body.items) {
                const item = inventory.find(i => i._id === key);
                const insurance = await this.getPremium(traderID, playerProfile, item._tpl)
                traderItems[item._tpl] = insurance; //item tpl as key for client to read totals

            }
            output[traderID] = traderItems
        }

        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(output));
    }

    static async insureItems(moveAction, playerProfile) {
        const inventory = await playerProfile.getInventoryItems();

        const { currency } = await Trader.getTraderBase(moveAction.tid);
        const acceptedCurrency = {
            RUB: "5449016a4bdc2d6f028b456f",
            USD: "5696686a4bdc2da3298b456a",
            EUR: "569668774bdc2da2298b4568"
        }[currency];

        const cart = [];
        for (const key of moveAction.items) {
            const item = inventory.find(i => i._id === key);
            cart.push({
                "id": key,
                "count": await this.getPremium(moveAction.tid, playerProfile, item._tpl)
            });
        }

        if (await payTrade(inventory, cart, acceptedCurrency)) {
            for (const key of moveAction.items) {
                const insurance = await playerProfile.getInsuredItems();
                insurance.push({
                    "tid": moveAction.tid,
                    "itemId": key
                });
            }
            await playerProfile.save();
        } else return ""
    }

    static async getPremium(traderID, playerProfile, itemTPL) {
        const { loyaltyLevels } = await Trader.getTraderBase(traderID);
        const loyaltyLevel = await playerProfile.getLoyalty(traderID);
        const { insurance_price_coef } = loyaltyLevels[loyaltyLevel];

        const coef = insurance_price_coef / 100
        return round((coef * await Item.getItemPrice(itemTPL)) * coef);
    }
}
module.exports.InsuranceController = InsuranceController;