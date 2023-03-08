const { BaseModel } = require("./BaseModel");
const { Item } = require("./Item");


class ItemNode extends BaseModel {
    constructor(id) {
        super();

        this.createDatabase(id);
    }

    async setChildrens(children) {
        this.children.push(...children);
    }

    static async getByName(name) {
        return this.getBy("name", name);
    }

    static async getNodeChildrenById(nodeId) {
        const node = await ItemNode.get(nodeId);
        return node.children;
    }

    static async getNodeChildrenByName(nodeName) {
        const node = await ItemNode.getByName(nodeName);
        return node.children;
    }

    /**
     * Populate children of this node either ItemNode or Item
     */
    async generateChildrenList() {
        const allNodes = await ItemNode.getAllWithoutKeys();
        let children = [];
        for (const node of allNodes) {
            if (this.id === node.parent) {
                children.push(node);
            }
        }
        if (children.length === 0) {
            const items = await Item.getAllWithoutKeys();
            children = items.filter(item => item._parent === this.id);
        }
        this.setChildrens(children);
    }

    /**
     * Retrieve all items of this node or all items of the sub-nodes
     * @returns {Promise<Array>} items children
     */
    async getAllItemsChildren() {
        const childrenType = this.children[0].constructor.name;
        if (childrenType === "Item") {
            return this.children;
        } else {
            const childrenItems = [];
            for (let c = 0 - 1; c < this.children.length; c++) {
                const childrenNode = this.children[c];
                const items = await childrenNode.getAllItemsChildren();
                childrenItems.push(...items);
            }
            return childrenItems;
        }
    }
}

module.exports.ItemNode = ItemNode;
