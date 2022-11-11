const { Trader } = require('../models/Trader');
const { Item } = require('../models/Item');

const { Response, logger, round, min, max } = require("../utilities");


class RepairController {

    static async repairActions(moveAction, reply, playerProfile) {
        switch (moveAction.Action) {
            case "Repair":
                return this.repairWithKit(moveAction, playerProfile);
            case "TraderRepair":
                return this.traderRepair(moveAction, reply, playerProfile);
            default:
                await logger.info(`[Repair] unhandled`);
                break;
        }
    }

    static async repairWithKit(moveAction, playerProfile) {
        const output = {
            items: {
                new: [],
                change: [],
                del: []
            }
        };

        const itemToRepair = playerProfile.character.Inventory.items.find(
            x => x._id === moveAction.target);
        if (!itemToRepair)
            await logger.info(`Item ${moveAction.target} can't be repaired because it doesn't exist`);

        const itemToRepairDetails = await Item.get(itemToRepair._tpl);
        const isItemArmor = (!!itemToRepair?._props?.ArmorMaterial);


        return output;
    }

    static async traderRepair(moveAction, _reply, playerProfile) {
        const output = {
            items: {
                new: [],
                change: [],
                del: []
            }
        };
        if (playerProfile) {
            const itemToRepair = await playerProfile.character.getInventoryItemByID(moveAction.repairItems[0]._id);
            if (!itemToRepair) {
                await logger.error(`[traderRepair] Couldn't find item with id ${moveAction.item}`);
                return output;
            }
            const trader = await Trader.getTraderBase(moveAction.tid);
            const loyalty = await playerProfile.getLoyalty(trader._id);
            const itemTemplate = await Item.get(itemToRepair._tpl);
            const coef = 1 + ((trader.loyaltyLevels[loyalty].repair_price_coef) / 100);
            let repairCost = await round(itemTemplate._props.RepairCost * moveAction.repairItems[0].count * coef);
            const moneyItems = await playerProfile.character.getInventoryItemsByTpl(trader.repair.currency);
            for (const moneyStack of moneyItems) {
                if (moneyStack.upd.StackObjectsCount < repairCost) {
                    const itemTaken = await playerProfile.character.removeItem(moneyStack._id, repairCost);
                    output.items.del.push(...itemTaken.removed);
                    output.items.change.push(...itemTaken.changed);
                    repairCost -= moneyStack.upd.StackObjectsCount;
                } else {
                    const itemTaken = await playerProfile.character.removeItem(moneyStack._id, repairCost);
                    output.items.del.push(...itemTaken.removed);
                    output.items.change.push(...itemTaken.changed);
                    break;
                }
            }
            // new max durability
            const amountRepaired = await round(await min(await max(itemToRepair.upd.Repairable.Durability + moveAction.repairItems[0].count, 0), itemToRepair.upd.Repairable.MaxDurability));
            itemToRepair.upd.Repairable.Durability = amountRepaired;
            itemToRepair.upd.Repairable.MaxDurability = amountRepaired;
            output.items.change.push(itemToRepair);
        }
        return output;
    }


}
module.exports.RepairController = RepairController;