const { BaseModel } = require("./BaseModel");
const { Item } = require("./Item");


class ItemNode extends BaseModel {
    constructor(id) {
        super();

        this.createDatabase(id);
    }

    async setChildrens(childrens) {
        this.childrens.push(...childrens);
    }

    static async getByName(name) {
        return this.getBy("name", name);
    }

    static async getNodeChildrenById(nodeId) {
        const node = await ItemNode.get(nodeId);
        return node.childrens;
    }

    static async getNodeChildrenByName(nodeName) {
        const node = await ItemNode.getByName(nodeName);
        return node.childrens;
    }

    /**
     * Populate children of this node either ItemNode or Item
     */
    async generateChildrensList() {
        const allNodes = await ItemNode.getAllWithoutKeys();
        let childrens = [];
        for (const node of allNodes) {
            if (this.id === node.parent) {
                childrens.push(node);
            }
        }
        if (childrens.length === 0) {
            const items = await Item.getAllWithoutKeys();
            childrens = items.filter(item => item._parent === this.id);
        }
        this.setChildrens(childrens);
    }

    /**
     * Retrieve all items of this node or all items of the sub-nodes
     * @returns {Promise<Array>} items childrens
     */
    async getAllItemsChildren() {
        const childrenType = this.childrens[0].constructor.name;
        if (childrenType === "Item") {
            return this.childrens;
        } else {
            const childrenItems = [];
            for (let c = this.childrens.length - 1; c > 0; c--) {
                const childrenNode = this.childrens[c];
                const items = await childrenNode.getAllItemsChildren();
                childrenItems.push(...items);
            }
            return childrenItems;
        }
    }
}

module.exports.ItemNode = ItemNode;
