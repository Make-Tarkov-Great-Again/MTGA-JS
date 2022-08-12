const { Trader } = require('../models/Trader');
const { Account } = require('../models/Account');
const { FastifyResponse, logger } = require("../../utilities");


class TradingController {

    static async clientTradingApiGetTradersList(_request = null, reply = null) {
        const traders = [];
        for (const [traderID, trader] of Object.entries(await Trader.getAll())) {
            if (trader.isRagfair())
                continue;
            traders.push(trader.base);
        }

        await FastifyResponse.zlibJsonReply
            (
                reply,
                FastifyResponse.applyBody(traders)
            );
    };

    static async clientTradingApiTraderSettings(_request = null, reply = null) {
        const traders = [];
        for (const [traderID, trader] of Object.entries(await Trader.getAll())) {
            if (trader.isRagfair())
                continue;
            traders.push(trader.base);
        }

        await FastifyResponse.zlibJsonReply
            (
                reply,
                FastifyResponse.applyBody(traders)
            );
    };

    static async clientTradingCustomizationStorage(request = null, reply = null) {
        const playerAccount = await Account.get(await FastifyResponse.getSessionID(request));
        const profile = await playerAccount.getProfile();
        const storageData = await profile.getStorage();
        await FastifyResponse.zlibJsonReply
            (
                reply,
                FastifyResponse.applyBody(storageData)
            );
    };

    static async getTraderAssort(request = null, reply = null) {
        const playerAccount = await Account.get(await FastifyResponse.getSessionID(request));
        const profile = await playerAccount.getProfile();
        const traderId = request.params.traderId
        const trader = await Trader.get(traderId);
        const res = await trader.getFilteredAssort(profile);
        await FastifyResponse.zlibJsonReply
            (
                reply,
                FastifyResponse.applyBody(res)
            );
    };

    static async getTraderOutfitOffers(request = null, reply = null) {
        const trader = await Trader.get(request.params.id);
        logger.logInfo(`Shows outfits for all sides, we'll decide if we care or not`);
        await FastifyResponse.zlibJsonReply
            (
                reply,
                FastifyResponse.applyBody(trader.suits)
            );
    };

    static async getUserAssortPrice(request = null, reply = null) {
        const playerAccount = await Account.get(await FastifyResponse.getSessionID(request));
        const profile = await playerAccount.getProfile();
        const traderId = request.params.traderId;
        const trader = await Trader.get(traderId);
        await FastifyResponse.zlibJsonReply
            (
                reply,
                FastifyResponse.applyBody(await trader.getPurchasesData(profile))
            );
    };

}
module.exports.TradingController = TradingController;
