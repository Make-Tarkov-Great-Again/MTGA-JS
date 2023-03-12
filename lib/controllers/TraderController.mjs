import { database } from '../../app.mjs';
import { Trader, Storage, Character } from '../classes/_index.mjs';
import { Response } from "../utilities/_index.mjs";

export class TraderController {

    static async clientItemPrices(request, reply) {
        const resupplyTime = await Trader.updateResupply(request.params.trader);
        const prices = {
            supplyNextTime: resupplyTime,
            prices: database.templates.priceTable,
            currencyCourses: {
                "5449016a4bdc2d6f028b456f": 1,
                "569668774bdc2da2298b4568": 116,
                "5696686a4bdc2da3298b456a": 111
            }
        }

        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(prices)
        );
    }

    static async clientTradingApiGetTradersInfo(reply) {
        const { globals } = database.core;
        const traders = await Object.values(Trader.getAll())
            .reduce(async (output, trader) => {
                if (!Trader.isRagfair(trader)) {

                    if (globals.config.EventType.includes("Halloween")) {
                        const avatar = trader.base.avatar.indexOf(".jpg")
                            ? trader.base.avatar.replace(".jpg", "_h.png")
                            : trader.base.avatar;
                        trader.base.avatar = avatar;
                    } else {
                        const avatar = trader.base.avatar.indexOf(".jpg")
                            ? trader.base.avatar.replace(".jpg", ".png")
                            : trader.base.avatar;
                        trader.base.avatar = avatar;
                    }
                    /* Temporarily disabled until there are Christmas trader icons
                    else if (globals.config.EventType.includes("Christmas")) {
                        trader.base.avatar = trader.base.avatar.indexOf(".jpg")
                            ? trader.base.avatar.replace(".jpg", "_c.png")
                            : trader.base.avatar.replace(".png", "_c.png")
                    }
                    */


                    (await output).push(trader.base);
                }
                return output;
            }, []);

        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(traders)
        );
    }

    static async clientTradingCustomizationStorage(sessionID, reply) {
        const storage = Storage.get(sessionID);
        const data = {
            _id: storage._id,
            suites: storage.suites
        };

        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(data)
        );
    }

    static async getTraderAssort(sessionID, traderID, reply) { //get information from route
        const character = Character.get(sessionID); //hang on my food is here
        const output = await Trader.generateFilteredAssort(character, traderID);

        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(output)
        );
    }

    static async getTraderOutfitOffers(request, reply) {
        const { suits } = Trader.get(request.params.id);

        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(suits)
        );
    }

    /*     static async getUserAssortPrice(request, reply) {
            const playerProfile = await Profile.get(await Response.getSessionID(request));
            const trader = await Trader.get(request.params.traderId);
            const purchasesData = await trader.getPurchasesData(playerProfile);
    
            return Response.zlibJsonReply(
                reply,
                await Response.applyBody(purchasesData)
            );
        } */
}