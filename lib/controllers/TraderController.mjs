import { database } from '../../app.mjs';
import { Trader, Storage, Character, Response } from '../classes/_index.mjs';

export class TraderController {

    static async clientItemPrices(request, reply) {
        const resupplyTime = await Trader.updateResupply(request.params.trader);
        const { priceTable } = database.templates;

        const prices = {
            supplyNextTime: resupplyTime,
            prices: priceTable,
            currencyCourses: {
                "5449016a4bdc2d6f028b456f": 1,
                "569668774bdc2da2298b4568": 116,
                "5696686a4bdc2da3298b456a": 111
            }
        }

        return Response.zlibJsonReply(
            reply,
            Response.applyBody(prices)
        );
    }

    static async clientTradingApiGetTradersInfo(reply) {
        const { globals } = database.core;

        const isHalloween = globals.config.EventType.includes("Halloween");
        const isChristmas = globals.config.EventType.includes("Christmas");

        const avatarSuffix = isHalloween ? "_h.png" : isChristmas ? "_c.png" : ".png";

        const traders = Object.values(Trader.getAll())
            .reduce((output, trader) => {
                if (!Trader.isRagfair(trader)) {
                    const avatar = trader.base.avatar.replace(/\.(jpg|png)/, avatarSuffix);
                    trader.base.avatar = avatar;
                    output.push(trader.base);
                }
                return output;
            }, []);

        return Response.zlibJsonReply(
            reply,
            Response.applyBody(traders)
        );
    }

    static async clientTradingCustomizationStorage(sessionID, reply) {
        const { _id, suites } = Storage.get(sessionID);
        //const data = { _id, suites };
        return Response.zlibJsonReply(
            reply,
            Response.applyBody({ _id, suites })
        );
    }

    static async getTraderAssort(sessionID, traderID, reply) { //get information from route
        const character = Character.get(sessionID); //hang on my food is here
        const output = await Trader.generateFilteredAssort(character, traderID);

        return Response.zlibJsonReply(
            reply,
            Response.applyBody(output)
        );
    }

    static async getTraderOutfitOffers(request, reply) {
        //const { suits } = Trader.get(request.params.id);

        return Response.zlibJsonReply(
            reply,
            Response.applyBody(Trader.get(request.params.id).suits)
        );
    }

    /*     static async getUserAssortPrice(request, reply) {
            const playerProfile = await Profile.get(await getSessionID(request));
            const trader = await Trader.get(request.params.traderId);
            const purchasesData = await trader.getPurchasesData(playerProfile);
    
            return Response.zlibJsonReply(
                reply,
                Response.applyBody(purchasesData)
            );
        } */
}