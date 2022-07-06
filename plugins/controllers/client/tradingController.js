/**
 * "/client/trading/api/getTradersList": this.clientTradingApiGetTradersList,
 * "/client/trading/api/traderSettings": this.clientTradingApiTraderSettings,
 * "/client/trading/customization/storage": this.clientTradingCustomizationStorage,
 */

const { database } = require("../../../app");
const { Trader, Profile, Account } = require("../../models");
const { read, FastifyResponse, logger } = require("../../utilities");


class TradingController {

    static clientTradingApiGetTradersList = async (_request = null, reply = null) => {
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


    static clientTradingApiTraderSettings = async (_request = null, reply = null) => {
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

    static getStoragePath = async (request = null, reply = null) => {
        const playerAccount = await Account.get(await FastifyResponse.getSessionID(request));
        const profile = await playerAccount.getProfile();
        const storagePath = profile.storage;
        await FastifyResponse.zlibJsonReply
            (
                reply,
                FastifyResponse.applyBody(storagePath)
            );
    };

    static getTraderAssort = async (request = null, reply = null) => {
        const playerAccount = await Account.get(await FastifyResponse.getSessionID(request));
        const profile = await playerAccount.getProfile();
        let splittedUrl = request.raw.url.split("/");
        splittedUrl = splittedUrl[splittedUrl.length - 1].split("?");
        const traderId = splittedUrl[0];
        const trader = await Trader.get(traderId);
        const res = await trader.getFilteredAssort(profile);
        console.log()
        await FastifyResponse.zlibJsonReply
            (
                reply,
                FastifyResponse.applyBody(res)
            );
    };

    static getUserAssortPrice = async (request = null, reply = null) => {
        const playerAccount = await Account.get(await FastifyResponse.getSessionID(request));
        const profile = await playerAccount.getProfile();
        let splittedUrl = request.raw.url.split("/");
        splittedUrl = splittedUrl[splittedUrl.length - 1].split("?");
        const traderId = splittedUrl[0];
        const trader = await Trader.get(traderId);
        await FastifyResponse.zlibJsonReply
            (
                reply,
                FastifyResponse.applyBody(await trader.getPurchasesData(profile))
            );
    };

}
module.exports.TradingController = TradingController;
