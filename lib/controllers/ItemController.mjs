import { logger } from "../utilities/_index.mjs";
import { Inventory } from "../classes/_index.mjs";

export class ItemController {

    static itemActions(moveAction, character, characterChanges) {
        const actionHandlers = {
            Split: () => Inventory.splitItem(character.Inventory, characterChanges, moveAction),
            Merge: () => Inventory.mergeItem(character, characterChanges, moveAction),
            Remove: () => Inventory.removeItem(character.Inventory, characterChanges, moveAction.item, -1),
            Fold: () => Inventory.foldItem(character.Inventory, moveAction),
            Move: () => Inventory.moveItems(character, moveAction),
            Examine: () => Inventory.examineItem(character, moveAction),
            Tag: () => Inventory.tagItem(character.Inventory, moveAction),
            Toggle: () => Inventory.toggleItem(character.Inventory, moveAction),
            Bind: () => Inventory.bindItem(character.Inventory, moveAction),
            Swap: () => Inventory.swapItem(character.Inventory, moveAction),
            Transfer: () => Inventory.transferItem(character.Inventory, moveAction),
            OpenRandomLootContainer: () => Inventory.openRandomLootContainer(character, moveAction)
        };

        logger.warn(`[ItemController :: ${moveAction.Action}]`);
        if (!actionHandlers.hasOwnProperty(moveAction.Action)) {
            logger.error(`[ItemController.itemActions] No action handler for ${moveAction.Action}`);
            return false;
        }
        return actionHandlers[moveAction.Action]();
    }
}