/**
 * "/client/trading/api/getTradersList": this.clientTradingApiGetTradersList,
 * "/client/trading/api/traderSettings": this.clientTradingApiTraderSettings,
 * "/client/trading/customization/storage": this.clientTradingCustomizationStorage,
 */

const { database } = require("../../../app");
const { read, fastifyResponse} = require("../../utilities");


class tradingController {
    static getAllTraders = async (request = null, reply = null) => {
        let traders = [];
        for (const traderID in database.traders) {
            if (traderID === "ragfair" || traderID === "names") {
                continue;
            }
            traders.push(database.traders[traderID].base);
        }
        return fastifyResponse.zlibJsonReply
            (
                reply,
                fastifyResponse.applyBody(traders)
            )
    }

    static getStoragePath = async (request = null, reply = null) => {
        const sessionID = await fastifyResponse.getSessionID(request);
        const storagePath = read(`user/profiles/${sessionID}/storage.json`);
        return fastifyResponse.zlibJsonReply
            (
                reply,
                fastifyResponse.applyBody(storagePath)
            )
    }
}
module.exports.tradingController = tradingController;