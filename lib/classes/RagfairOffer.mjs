import { generateMongoID, getCurrentTimestamp } from "../utilities/utility.mjs";


export class RagfairOffer {
    constructor(offerNumber, itemData, user, offerEnd, buyRestriction=false) {
        this.setIds(offerNumber);
        this.setUser(user);
        this.setCosts(parseInt(itemData.barter[0].count));
        this.setOfferDuration(getCurrentTimestamp(), offerEnd);
        this.root = itemData.item?.[0]
            ? itemData.item[0]._id
            : itemData.item._id
        this.items = [...itemData.item];
        this.requirements = itemData.barter;
        this.sellInOnePiece = false;
        this.locked = false;
        this.loyaltyLevel = itemData.loyality;
        if (buyRestriction) {
            this.setBuyRestriction(buyRestriction);
        }
        if (typeof itemData.item === "object" && itemData.item?.upd && itemData.item?.UnlimitedCount) {
            this.setUnlimitedCount(itemData.item.upd.unlimitedCount);
        } else if (itemData.item[0]?.upd && itemData.item[0]?.UnlimitedCount) {
            this.setUnlimitedCount(itemData.item[0].upd.unlimitedCount);
        } else {
            this.setUnlimitedCount(false);
        }
    }

    setIds(offerNumber) {
        this._id = generateMongoID();
        this.intId = offerNumber;
    }

    setUser(user) {
        this.user = user;
    }

    setCosts(itemsCost) {
        this.itemsCost = itemsCost;
        this.requirementsCost = itemsCost;
        this.summaryCost = itemsCost;
    }

    setOfferDuration(timestamp, offerEnd) {
        this.startTime = timestamp - 3600;
        this.endTime = offerEnd;
    }

    setUnlimitedCount(unlimitedCount) {
        this.unlimitedCount = unlimitedCount;
    }

    setBuyRestriction(buyRestriction) {
        this.buyRestrictionCurrent = buyRestriction.current;
        this.buyRestrictionMax = buyRestriction.max;
    }

    isExpired() {
        return getCurrentTimestamp() > this.endTime;
    }

    isTraderOffer() {
        return this.user.memberType === 4;
    }

    refreshTraderOffer(trader) {
        this.setOfferDuration(getCurrentTimestamp(), trader.assort.nextResupply);
    }

}
