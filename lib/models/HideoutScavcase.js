const { BaseModel } = require("./BaseModel");

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
            const amountProducts = Math.floor(Math.random() * availableRarity[rarity]);
            console.log()
        }
        console.log()
    }
}

module.exports.HideoutScavcase = HideoutScavcase;