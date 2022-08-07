const { logger, generateMongoID } = require("../../utilities");
const { BaseModel } = require("./BaseModel");
const { Item } = require("./Item");


class ItemNode extends BaseModel {
    constructor(id) {
        super();

        this.createDatabase(id);
    }

    async generateChildrensList() {
        const allNodes = await ItemNode.getAllWithoutKeys();
        for (const node of allNodes) {
            if (this.id === node.parent) {
                this.childrens.push(node);
            }
        }
        if (this.childrens.length === 0) {
            const items = await Item.getAllWithoutKeys();
            const childrenItems = items.filter(item => item._parent === this.id);
            this.childrens = childrenItems;
        }
    }
}

module.exports.ItemNode = ItemNode;
