//const { InsuranceController } = require("../../lib/controllers")

const { Trader } = require("../../lib/models/Trader")
const { Profile } = require("../../lib/models/Profile")
const { logger, FastifyResponse, isCategory } = require("../../utilities")
const { Item } = require("../../lib/models/Item")

module.exports = async function insuranceRoutes(app, _opts) {

    app.post(`/client/insurance/items/list/cost`, async (request, reply) => {
        const playerProfile = await Profile.get(await FastifyResponse.getSessionID(request));
        const inventory = await playerProfile.getInventoryItems()

        const output = {};

        for (const trader of request.body.traders) {
            const base = await Trader.getTraderBase(trader);
            const loyalty = await playerProfile.getLoyalty(trader, base);
            const traderLoyalty = base.loyaltyLevels[loyalty];

            const traderItems = {};

            for (const key of request.body.items) {
                const item = inventory.find(i => i._id === key)
                const coef = traderLoyalty.insurance_price_coef / 100
                const insurance = ~~((coef * await Item.getItemPrice(item._tpl)) * coef);
                traderItems[item._tpl] = insurance;
            }
            output[trader] = traderItems
        }


        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(output));
    })
}