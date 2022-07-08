const { Ragfair, Trader } = require("../plugins/models");
const { findChildren } = require("../plugins/utilities");
const { database } = require("../engine/database");

class RagfairLoader {

    static async loadRagfairDatabase() {
        await this.loadRagfair();
    }


    static async loadRagfair() {

        let response = {
            "categories": {},
            "offers": [],
            "offersCount": 100,
            "selectedCategory": "5b5f78dc86f77409407a7f8e"
        };

        const traders = await Trader.getAll();
        for (const trader of traders) {
            if (trader.isRagfair() || trader.isFence()) {
                continue;
            }

            const assort = trader.assort;

            for (const item of assort.items) {
                if (item.slotId === "hideout") {
                    let itemsToSell = [];

                    let barter_scheme = null;
                    let loyal_level = null;

                    itemsToSell.push(item);
                    itemsToSell = [...itemsToSell, ...await findChildren(item._id, assort.items)];
                }

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

                response.offers.push(await this.convertToRagfairAssort(itemsToSell, barter_scheme, loyal_level, counter));
            }
        }
        logger.logDebug(`[Ragfair Cache] Generated ${counter} offers inluding all traders assort`);
        database.ragfair_offers = response;

    }

    static async convertToRagfairAssort(items, barter, loyal_level, counter) {
        let offer = database.core.traderFleaOfferTemplate.clone();
        const traderObj = global._database.traders[trader].base;
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