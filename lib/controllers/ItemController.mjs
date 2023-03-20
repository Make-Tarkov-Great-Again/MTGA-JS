import { logger, stringify } from "../utilities/_index.mjs";
import { Inventory } from "../classes/_index.mjs";

export class ItemController {

    static async itemActions(moveAction, character, characterChanges) {
        logger.warn(`[ItemController] ${stringify(moveAction)}`);
        switch (moveAction.Action) {
            case "Split":
                return Inventory.splitItem(character.Inventory, characterChanges, moveAction);
            case "Merge":
                return Inventory.mergeItem(character.Inventory, characterChanges, moveAction);
            case "Remove":
                return Inventory.removeItem(character.Inventory, characterChanges, moveAction.item, -1);
            case "Fold":
                return Inventory.foldItem(character.Inventory, moveAction);
            case "Move":
                return Inventory.moveItems(character, moveAction);
            case "Examine":
                return Inventory.examineItem(character, moveAction);
            case "Tag":
                return Inventory.tagItem(character.Inventory, moveAction);
            case "Toggle":
                return Inventory.toggleItem(character.Inventory, moveAction);
            case "Bind":
                return Inventory.bindItem(character.Inventory, moveAction);
            case "Swap":
                return Inventory.swapItem(character.Inventory, moveAction);
            case "Transfer":
                return Inventory.transferItem(character.Inventory, moveAction);
            case "OpenRandomLootContainer":
                return Inventory.openRandomLootContainer(character, moveAction);
        }
    }
}