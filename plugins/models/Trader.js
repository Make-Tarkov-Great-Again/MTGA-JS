const { BaseModel } = require("./BaseModel");
const { findAndReturnChildrenByItems } = require("../utilities");

class Trader extends BaseModel {
    constructor(id) {
        super();

        this.createDatabase(id);
    }

    isRagfair() {
        return this.base._id === "ragfair";
    }

    async getFilteredAssort(profile) {
        const loyalty = await profile.getLoyalty(this.base._id, this.base);

        let traderClone = await this.clone();

        if (this.isRagfair())
            return traderClone.assort;

        //for (const [itemID, itemData] of Object.entries(traderClone.assort)) {
        //    if (itemData.loyalty > loyalty) {
        //        traderClone.assort = await this.removeItemFromAssort(traderClone.assort, itemID);
        //        continue
        //    }
        //}

        return traderClone.assort;
    }

    async removeItemFromAssort(assort, itemID) {
        const idsList = await findAndReturnChildrenByItems(assort, itemID);
        delete assort[itemID];
        for (const i in idsList) {
            for (const a in assort) {
                if (assort.items[a]._id === idsList[i]) {
                    assort.items.splice(a, 1);
                }
            }
        }
        return assort;
    }
}

module.exports.Trader = Trader;