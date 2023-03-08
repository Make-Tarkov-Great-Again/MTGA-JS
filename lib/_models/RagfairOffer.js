//const { generateMongoID, getCurrentTimestamp } = require("../utilities/index.mjs");
const { BaseModel } = require("./BaseModel");

class RagfairOffer extends BaseModel {
    constructor() {
        super();
    }

    static async getById(id, ragfairOffers) {
        for (const offer of ragfairOffers) {
            if (offer._id === id) {
                return offer;
            }
        }
        return false;
    }

    static async getOfferByItemId(itemId, ragfairOffers) {
        for (const offer of ragfairOffers) {
            if (offer.root === itemId) {
                return offer;
            }
        }
        return false;
    }

    async setIds(offerNumber) {
        this._id = await generateMongoID();
        this.intId = offerNumber;
    }

    async setUser(user) {
        this.user = user;
    }

    async setCosts(itemsCost) {
        this.itemsCost = itemsCost;
        this.requirementsCost = itemsCost;
        this.summaryCost = itemsCost;
    }

    async setOfferDuration(timestamp, offerEnd) {
        this.startTime = timestamp - 3600;
        this.endTime = offerEnd;
    }

    async setUnlimitedCount(unlimitedCount) {
        this.unlimitedCount = unlimitedCount;
    }

    async setBuyRestriction(buyRestriction) {
        this.buyRestrictionCurrent = buyRestriction.current;
        this.buyRestrictionMax = buyRestriction.max;
    }

    async loadOffer(offerNumber, itemData, user, offerEnd, buyRestriction = false) {
        await this.setIds(offerNumber);
        await this.setUser(user);
        await this.setCosts(parseInt(itemData.barter[0].count));
        await this.setOfferDuration(getCurrentTimestamp(), offerEnd);
        this.root = itemData.item?.[0]
            ? itemData.item[0]._id
            : itemData.item._id
        this.items = [...itemData.item];
        this.requirements = itemData.barter;
        this.sellInOnePiece = false;
        this.locked = false;
        this.loyaltyLevel = itemData.loyality;
        if (buyRestriction) {
            await this.setBuyRestriction(buyRestriction);
        }
        if (typeof itemData.item === "object" && itemData.item?.upd && itemData.item?.UnlimitedCount) {
            await this.setUnlimitedCount(itemData.item.upd.unlimitedCount);
        } else if (itemData.item[0]?.upd && itemData.item[0]?.UnlimitedCount) {
            await this.setUnlimitedCount(itemData.item[0].upd.unlimitedCount);
        } else {
            await this.setUnlimitedCount(false);
        }
    }

    async isExpired() {
        const currentTimeStamp = getCurrentTimestamp();
        return currentTimeStamp > this.endTime;
    }

    async isTraderOffer() {
        return this.user.memberType === 4;
    }

    async refreshTraderOffer(trader) {
        const currentTimeStamp = getCurrentTimestamp();
        await this.setOfferDuration(currentTimeStamp, trader.assort.nextResupply);
    }
}

module.exports.RagfairOffer = RagfairOffer;
