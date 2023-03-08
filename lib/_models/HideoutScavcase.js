const { generateMongoID, getRandomInt } = require("../utilities/index.mjs").default;
const { BaseModel } = require("./BaseModel");
const { Item } = require("./Item");

class HideoutScavcase extends BaseModel {
    constructor(id) {
        super();

        this.createDatabase(id);
    }

    /**
     * Filter possible rarity of reward for a scav case recipe
     * @returns {Object} available rarity
     */
    async getEndProductsRarity() {
        return Object.fromEntries(Object.entries(this.EndProducts).filter(endProducts => {
            return endProducts[1].max > 0;
        }));
    }

    /**
     * Generate random rewards for scav cases
     * @returns {Array} list of rewards
     */
    async generateRewards() {
        const rewards = [];
        const availableRarity = await this.getEndProductsRarity();
        for (const rarity in availableRarity) {
            const possibleRewards = [];
            const amountProducts = getRandomInt(availableRarity[rarity].min, availableRarity[rarity].max);
            const items = await Item.getAllWithoutKeys();

            for (const item of items) {
                if (await item.getRarityByPrice() === rarity && !await item.isBlacklisted()) {
                    possibleRewards.push(item);
                }
            }
            for (let i = amountProducts.length - 1; i > -1; i--) {
                const randomIndex = getRandomInt(0, possibleRewards.length - 1);
                const id = await generateMongoID();
                rewards.push({
                    _id: id,
                    _tpl: possibleRewards[randomIndex]._id
                });
            }
        }
        return rewards;
    }
}

module.exports.HideoutScavcase = HideoutScavcase;