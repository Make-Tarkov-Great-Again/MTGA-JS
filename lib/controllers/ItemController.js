const { logger } = require("../../utilities");
const { Item } = require('../models/Item');
const { Trader } = require('../models/Trader');
const { Ragfair } = require('../models/Ragfair');


class ItemController {
    static async splitItem(moveAction = null, _reply = null, playerProfile = null) {
        const splittedItems = await playerProfile.character.splitItems(moveAction);
        if (splittedItems) {
            return {
                items: { new: [splittedItems] }
            };
        }
        return false;
    }

    static async mergeItem(moveAction = null, _reply = null, playerProfile = null) {
        const mergedItems = await playerProfile.character.mergeItems(moveAction);
        if (mergedItems) {
            return {
                items: { del: [mergedItems] }
            };
        }
        return false;
    }

    static async removeItem(moveAction = null, _reply = null, playerProfile = null) {
        const deletedItems = await playerProfile.character.removeItems(moveAction);
        if (deletedItems) {
            return {
                items: { del: [deletedItems] }
            };
        }
        return false;
    }

    static async foldItem(moveAction = null, _reply = null, playerProfile = null) {
        const item = await playerProfile.character.getInventoryItemByID(moveAction.item);
        if (item) {
            if (typeof item.upd === "undefined") {
                item.upd = {};
            }

            if (typeof item.upd.Foldable === "undefined") {
                item.upd.Foldable = {};
            }

            item.upd.Foldable.Folded = moveAction.value;
        }
    }

    static async moveItem(moveAction = null, _reply = null, playerProfile = null) {
        logger.logDebug(`Move request:` + moveAction);

        const movedItems = await playerProfile.character.moveItems(moveAction);
        if (!movedItems) {
            logger.logError("[moveItem] Failed to move items, report to a developer.");
        }
        return {};
    }

    static async examineItem(moveAction = null, _reply = null, playerProfile = null) {
        logger.logDebug(`Examine request:` + moveAction);

        let templateItem;

        if (typeof moveAction.fromOwner !== "undefined") {
            switch (moveAction.fromOwner.type) {
                case "Trader":
                    const trader = await Trader.get(moveAction.fromOwner.id);
                    if (trader) {
                        const inventoryItem = await trader.getAssortItemByID(moveAction.item);
                        if (inventoryItem) {
                            templateItem = await Item.get(inventoryItem._tpl);
                        } else {
                            logger.logError(`[examineItem] Examine Request failed: Unable to find item database template of itemId ${moveAction.item}`);
                            return false;
                        }
                    } else {
                        logger.logError("[examineItem] Examine Request failed: Unable to get trader data.");
                        return false;
                    }
                    break;

                case "RagFair":
                    const ragfair = await Ragfair.get("FleaMarket");
                    const ragfairOffers = ragfair.offers;
                    const item = ragfairOffers.find(function (i) {
                        if (i._id === moveAction.fromOwner.id) return i;
                    });
                    templateItem = await Item.get(item.items[0]._tpl);
                    break;

                case "HideoutUpgrade":
                case "HideoutProduction":
                case "ScavCase":
                    templateItem = await Item.get(moveAction.item);
                    break;

                default:
                    logger.logError(`[examineItem] Examine Request failed: Unknown moveAction.fromOwner.Type: ${moveAction.fromOwner.type}`);
                    return false;
            }
        } else {
            const item = await playerProfile.character.getInventoryItemByID(moveAction.item);
            if (item) {
                templateItem = await Item.get(item._tpl);
            } else {
                logger.logError(`[examineItem] Examine Request failed: Unable to find item database template of itemId ${moveAction.item}`);
                return false;
            }
        }

        if (templateItem) {
            if (await playerProfile.character.examineItem(templateItem._id)) {
                await playerProfile.character.addExperience(templateItem._props.ExamineExperience);
            } else {
                logger.logError(`[examineItem] Examine Request failed: Unable to examine itemId ${templateItem._id}`);
            }
        } else {
            logger.logError(`[examineItem] Examine Request failed: Unable to find item database template`);
        }

        return {};
    }

    static async tagItem(moveAction = null, _reply = null, playerProfile = null) {
        if (playerProfile) {
            const item = await playerProfile.character.getInventoryItemByID(moveAction.item);
            if (item) {
                if (typeof item.upd === "undefined") {
                    item.upd = {};
                }

                if (typeof item.upd.Tag === "undefined") {
                    item.upd.Tag = {};
                }

                item.upd.Tag.Color = moveAction.TagColor;
                item.upd.Tag.Name = moveAction.TagName;
            }
        }
    }

    static async toggleItem(moveAction = null, _reply = null, playerProfile = null) {
        if (playerProfile) {
            const item = await playerProfile.character.getInventoryItemByID(moveAction.item);
            if (item) {
                if (typeof item.upd === "undefined") {
                    item.upd = {};
                }

                if (typeof item.upd.Togglable === "undefined") {
                    item.upd.Togglable = {};
                }

                item.upd.Togglable.On = moveAction.value;
            }
        }
    }

    static async bindItem(moveAction = null, _reply = null, playerProfile = null) {
        if (playerProfile) {
            for (const index in playerProfile.character.Inventory.fastPanel) {
                if (playerProfile.character.Inventory.fastPanel[index] === moveAction.item) {
                    playerProfile.character.Inventory.fastPanel[index] = "";
                }
            }
            playerProfile.character.Inventory.fastPanel[moveAction.index] = moveAction.item;
        }
    }

}

module.exports.ItemController = ItemController;
