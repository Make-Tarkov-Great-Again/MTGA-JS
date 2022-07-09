const { Trader } = require("../plugins/models");
const { UtilityModel } = require("../plugins/models/UtilityModel");
const { findChildren, logger } = require("../plugins/utilities");
const database = require("../engine/database");
const { padEnd } = require("lodash");
const cloneDeep = require('rfdc')()


class RagfairLoader {


    static async loadRagfair() {

        let ragfair = {
            categories: {},
            offers: [],
            offersCount: 0,
            selectedCategory: ""
        };
        let counter = 0;

        const traders = await Trader.getAll();
        for (const trader in traders) {
            if (traders[trader].isRagfair() || traders[trader].isFence()) {
                continue;
            }

            const assort = traders[trader].assort;

            for (const item of assort.items) {

                if (item.slotId === "hideout") {
                    let itemsToSell = [];

                    let barter_scheme = null;
                    let loyal_level = 0;

                    itemsToSell.push(item);
                    itemsToSell = [...itemsToSell, ...await findChildren(item._id, assort.items)];


                    for (const barter in assort.barter_scheme) {
                        if (item._id == barter) {
                            barter_scheme = assort.barter_scheme[barter][0];
                            break;
                        }
                    }

                    for (const loyal in assort.loyal_level_items) {
                        if (item._id == loyal) {
                            loyal_level = assort.loyal_level_items[loyal];
                            break;
                        }
                    }

                    ragfair.offers.push(await this.convertToRagfairAssort(itemsToSell, barter_scheme, loyal_level, traders[trader], counter));
                    counter += 1;
                }
            }
        }
        logger.logDebug(`[RAGFAIR] Generated ${counter} offers with all traders assort`);
        return ragfair;
    }

    static async convertItemsToRagfairAssort() {

        

    }

    static async convertToRagfairAssort(items, barter, loyal_level, trader, counter) {
        let offer = cloneDeep(database.core.traderFleaOfferTemplate);
        const traderObj = trader.base;
        offer._id = items[0]._id;
        offer.intId = counter;
        offer.user = {
            "id": traderObj._id,
            "memberType": 4,
            "nickname": traderObj.surname,
            "rating": 1,
            "isRatingGrowing": true,
            "avatar": traderObj.avatar
        };
        offer.root = items[0]._id;
        offer.items = items;
        offer.requirements = barter;
        offer.buyRestrictionMax = items[0].upd.BuyRestrictionMax

        offer.loyaltyLevel = loyal_level;
        return offer;
    }
}
module.exports.RagfairLoader = RagfairLoader;