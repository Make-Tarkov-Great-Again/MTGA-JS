const { BaseModel } = require("./BaseModel");

class Item extends BaseModel {
    constructor(id) {
        super(id);

        this.createDatabase(id);
    }

    static async bannedItems() {
        return [
            "Pockets",
            "Shrapnel",
            "QuestRaidStash",
            "QuestOfflineStash",
            "stash 10x300",
            "Standard stash 10x28",
            "Prepare for escape stash 10x48",
            "Left Behind stash 10x38",
            "Edge of darkness stash 10x68",
            "Стандартный инвентарь" //default inventory
        ];
    }

    static async generatePriceTable(templatesItems) {
        let priceTable = {};
        for (const item of templatesItems) {
            if (item.Price === 0) continue;
            priceTable[item.Id] = item.Price;
        }
        return priceTable;
    }
}

module.exports.Item = Item;