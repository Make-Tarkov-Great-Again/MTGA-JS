/**
 * "/client/trading/api/getTradersList": this.clientTradingApiGetTradersList,
 * "/client/trading/api/traderSettings": this.clientTradingApiTraderSettings,
 * "/client/trading/customization/storage": this.clientTradingCustomizationStorage,
 */

const { database } = require("../../../app");
const { Trader } = require("../../models");
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
}
module.exports.TradingController = TradingController;