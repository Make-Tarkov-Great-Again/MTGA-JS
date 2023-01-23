const { Trader } = require('../models/Trader');
const { Item } = require('../models/Item');

const { logger, round, min, max, float } = require("../utilities");
const { database: { core: { globals: {
    config: {
        SkillsSettings: { WeaponTreatment: { SkillPointsPerRepair } },
        ArmorMaterials
    } } } } } = require(`../../app`);
const { Quest } = require('../models/Quest');
const { ItemNode } = require('../models/ItemNode');


class RepairController {

    static async repairActions(moveAction, reply, playerProfile) {
        switch (moveAction.Action) {
            case "Repair":
                return this.repairWithKit(moveAction, playerProfile);
            case "TraderRepair":
                return this.traderRepair(moveAction, reply, playerProfile);
            default:
                logger.info(`[Repair] unhandled`);
                break;
        }
    }

    static async repairWithKit(moveAction, playerProfile) {
        const output = {
            items: {
                new: [],
                change: [],
                del: []
            },
            skills: {
                Common: playerProfile.character.Skills.Common
            }
        };
        const repairKits = moveAction.repairKitsInfo;
        const toRepair = repairKits[0].count;

        const itemToRepair = await playerProfile.character.getInventoryItemByID(moveAction.target);
        if (!itemToRepair)
            logger.info(`Item ${moveAction.target} can't be repaired because it doesn't exist`);

        const { _parent, _props } = await Item.get(itemToRepair._tpl);

        await Durability.updateItemDurability(itemToRepair, _props, toRepair, 1, true);
        output.items.change.push(itemToRepair);

        for (const kit of repairKits) {
            const repairKit = await playerProfile.character.getInventoryItemByID(kit._id);
            if (repairKit)
                repairKit.upd.RepairKit.Resource -= toRepair;

            output.items.change.push(repairKit);
        }

        // 5422acb9af1c889c16000029 weapon parentId
        const node = await ItemNode.getNodeChildrenById("5422acb9af1c889c16000029")
        if (node.find(x => _parent === x.id)) {
            await Quest.processSkillPoints(output, playerProfile.character, "WeaponTreatment", SkillPointsPerRepair);
        }
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
                logger.error(`[traderRepair] Couldn't find item with id ${moveAction.item}`);
                return output;
            }

            const repairAmount = moveAction.repairItems[0].count;

            const { loyaltyLevels, repair } = await Trader.getTraderBase(moveAction.tid);
            const loyalty = await playerProfile.getLoyalty(moveAction.tid);
            const { _props } = await Item.get(itemToRepair._tpl);

            const coef = 1 + ((loyaltyLevels[loyalty].repair_price_coef) / 100);
            let repairCost = await round(_props.RepairCost * repairAmount * coef);


            const moneyItems = await playerProfile.character.getInventoryItemsByTpl(repair.currency);

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

            await Durability.updateItemDurability(itemToRepair, _props, repairAmount, repair.quality, false)
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

        let max = toRepair.upd.Repairable.MaxDurability + repairAmount
        if (max > toRepair.upd.Repairable.MaxDurability)
            max = toRepair.upd.Repairable.MaxDurability;


        max = toRepairProperties?.ArmorMaterial // kit repair
            ? max -= await this.armorRepairDegradation(
                toRepairProperties.ArmorMaterial, max, quality, useKit)
            : max -= await this.weaponRepairDegradation(toRepairProperties, max, quality, useKit);

        toRepair.upd.Repairable.Durability = max;
        toRepair.upd.Repairable.MaxDurability = max;

        if (toRepair?.upd?.FaceShield?.Hits > 0)
            toRepair.upd.FaceShield.Hits = 0;
    }

    static async armorRepairDegradation(material, maxDurability, quality, useKit) {

        const [min, max] = [
            !useKit
                ? ArmorMaterials[material].MinRepairDegradation
                : ArmorMaterials[material].MinRepairKitDegradation,
            !useKit
                ? ArmorMaterials[material].MaxRepairDegradation
                : ArmorMaterials[material].MaxRepairKitDegradation
        ];
        return Number(((await float(min, max) * maxDurability) * quality).toFixed(2));
    }

    static async weaponRepairDegradation(props, maxDurability, quality, useKit) {
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

        return Number(((await float(min, max) * maxDurability) * quality).toFixed(2));
    }

}
module.exports.Durability = Durability;
module.exports.RepairController = RepairController;