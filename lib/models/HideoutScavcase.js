const { generateMongoID, getRandomInt } = require("../../utilities");
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
                if (await item.getRarityByPrice() === rarity && !await item.isBanned()) {
                    possibleRewards.push(item);
                }
            }
            for (let i = 0; i < amountProducts; i++) {
                const randomIndex = getRandomInt(0, possibleRewards.length - 1);
                rewards.push({
                    _id: await generateMongoID(),
                    _tpl: possibleRewards[randomIndex]._id
                });
            }
        }
        return rewards;
    }
}

module.exports.HideoutScavcase = HideoutScavcase;