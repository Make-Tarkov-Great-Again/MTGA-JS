const { Trader } = require('../models/Trader');
const { Item } = require('../models/Item');

const { logger, round, min, max, float } = require("../utilities");
const { database: { core: { globals: { config: { ArmorMaterials } } } } } = require(`../../app`);


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
        const repairKits = moveAction.repairKitsInfo;
        const itemToRepair = playerProfile.character.Inventory.items.find(
            x => x._id === moveAction.target);
        if (!itemToRepair)
            await logger.info(`Item ${moveAction.target} can't be repaired because it doesn't exist`);

        const { _props } = await Item.get(itemToRepair._tpl);

        await Durability.updateItemDurability(itemToRepair, _props, repairKits[0].count, 1, true)


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

class Durability {
    /**
     * Set new Durability and MaxDurability of item after repairs
     * @param {*} toRepair item to repair
     * @param {*} toRepairProperties properties of item to repair
     * @param {*} repairAmount value amount to repair
     * @param {*} quality repair quality multiplier
     * @param {*} useKit repair with kit?
     */
    static async updateItemDurability(toRepair, toRepairProperties, repairAmount, quality = 1, useKit = false) {
        let current = toRepair.upd.Repairable.Durability + repairAmount
        if (current > toRepair.upd.Repairable.MaxDurability)
            current = toRepair.upd.Repairable.MaxDurability;


        let max = toRepair.upd.Repairable.MaxDurability + repairAmount
        if (max > toRepair.upd.Repairable.MaxDurability)
            max = toRepair.upd.Repairable.MaxDurability;
        max = (!!toRepairProperties?.ArmorMaterial) // kit repair
            ? await this.armorRepairDegradation(
                toRepairProperties.ArmorMaterial, max, quality, useKit)
            : await this.weaponRepairDegradation(toRepairProperties, max, quality, useKit);


        toRepair.upd.Repairable.Durability = current;
        toRepair.upd.Repairable.MaxDurability = max;

        if (toRepair?.upd?.FaceShield?.Hits > 0)
            toRepair.upd.FaceShield.Hits = 0;
    }

    static async armorRepairDegradation(material, maxDurability, quality, kit = false) {

        const [min, max] = [
            !useKit
                ? ArmorMaterials[material].MinRepairDegradation
                : ArmorMaterials[material].MinRepairKitDegradation,
            !useKit
                ? ArmorMaterials[material].MaxRepairDegradation
                : ArmorMaterials[material].MaxRepairKitDegradation
        ];
        const percent = Number(((await float(min, max) * maxDurability) * quality).toFixed(2));
        return percent;
    }

    static async weaponRepairDegradation(props, maxDurability, quality, useKit = false) {
        const [min, max] = [
            !useKit
                ? props.MinRepairDegradation
                : props.MinRepairKitDegradation,
            !useKit
                ? props.MaxRepairDegradation
                : props.MaxRepairKitDegradation === 0 //if equal 0
                    ? props.MaxRepairDegradation // fallback
                    : props.MaxRepairKitDegradation
        ];

        const percent = Number(((await float(min, max) * maxDurability) * quality).toFixed(2));
        return percent;
    }

}
module.exports.Durability = Durability;
module.exports.RepairController = RepairController;