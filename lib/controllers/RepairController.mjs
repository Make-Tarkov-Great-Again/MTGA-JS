import { database } from '../../app.mjs';

import { Character, Inventory, Item, Quest, Trader } from '../classes/_index.mjs';

import {
    logger, round, float,
    getPercentOf, getRandomInt, getRandomFromArray
} from "../utilities/_index.mjs";


export class RepairController {

    static async repairActions(moveAction, character, characterChanges) {
        switch (moveAction.Action) {
            case "Repair":
                return this.repairWithKit(moveAction, character, characterChanges);
            case "TraderRepair":
                return this.traderRepair(moveAction, character, characterChanges);
            default:
                return logger.info(`[Repair] ${moveAction.Action} unhandled`);
        }
    }

    static async repairWithKit(moveAction, character, characterChanges) {
        const { globals } = database.core;
        const repairKits = moveAction.repairKitsInfo;
        const toRepair = repairKits[0].count;

        const itemToRepair = await Inventory.getInventoryItemByID(moveAction.target);
        if (!itemToRepair)
            logger.info(`Item ${moveAction.target} can't be repaired because it doesn't exist`);

        const item = Item.get(itemToRepair._tpl);

        await DurabilityController.updateItemDurability(character, itemToRepair, item, toRepair, 1, true);
        characterChanges.items.change.push(itemToRepair);

        for (const kit of repairKits) {
            const repairKit = await Inventory.getInventoryItemByID(kit._id);
            if (repairKit)
                repairKit.upd.RepairKit.Resource -= toRepair;

            characterChanges.items.change.push(repairKit);
        }

        // 5422acb9af1c889c16000029 weapon parentId
        const node = await ItemNode.getNodeChildrenById("5422acb9af1c889c16000029")
        if (node.find(x => item._parent === x.id)) {
            await Quest.processSkillPoints(characterChanges, playerProfile.character, "WeaponTreatment", globals.config.SkillsSettings.WeaponTreatment.SkillPointsPerRepair);
        }
        return output;
    }

    static async traderRepair(moveAction, character, characterChanges) {
        const itemToRepair = await Inventory.getInventoryItemByID(moveAction.repairItems[0]._id);
        if (!itemToRepair)
            return logger.error(`[traderRepair] Couldn't find item with id ${moveAction.item}`);

        const repairAmount = moveAction.repairItems[0].count;

        const { loyaltyLevels, repair } = Trader.getTraderBase(moveAction.tid);
        const loyalty = await Character.getLoyalty(character, moveAction.tid);
        const item = Item.get(itemToRepair._tpl);

        const coef = 1 + ((loyaltyLevels[loyalty].repair_price_coef) / 100);
        let repairCost = round(item._props.RepairCost * repairAmount * coef);

        const moneyItems = await Inventory.getInventoryItemsByTpl(repair.currency);

        for (const moneyStack of moneyItems) {
            if (moneyStack.upd.StackObjectsCount < repairCost) {
                await Inventory.removeItem(character, characterChanges, moneyStack._id, repairCost);
                repairCost -= moneyStack.upd.StackObjectsCount;
            } else {
                await Inventory.removeItem(character, characterChanges, moneyStack._id, repairCost);
                break;
            }
        }

        await DurabilityController.updateItemDurability(
            character,
            itemToRepair,
            item,
            repairAmount,
            repair.quality,
            false).then(() => characterChanges.items.change.push(itemToRepair));
    }

}

export class DurabilityController {
    /**
     * Set new Durability and MaxDurability of item after repairs
     * @param {*} toRepair item to repair
     * @param {*} item to repair
     * @param {*} repairAmount value amount to repair
     * @param {*} quality repair quality multiplier
     * @param {*} useKit repair with kit?
     */
    static async updateItemDurability(character, toRepair, item, repairAmount, quality = 1, useKit = false) {

        const isArmor = !!(item._props?.ArmorMaterial);
        repairAmount /= await this.getKitDivisor(character, item._props, isArmor)

        let max = toRepair.upd.Repairable.MaxDurability + repairAmount
        if (max > toRepair.upd.Repairable.MaxDurability)
            max = toRepair.upd.Repairable.MaxDurability;

        max = isArmor // kit repair
            ? max -= await this.armorRepairDegradation(
                item._props.ArmorMaterial, max, quality, useKit)
            : max -= await this.weaponRepairDegradation(item._props, max, quality, useKit);

        toRepair.upd.Repairable.Durability = max;
        toRepair.upd.Repairable.MaxDurability = max;

        if (toRepair.upd?.FaceShield?.Hits > 0)
            toRepair.upd.FaceShield.Hits = 0;

        if (await this.decideToBuff(item._props, max, character)) {
            await this.getBuff(toRepair.upd, isArmor);
        };
    }

    static async armorRepairDegradation(material, maxDurability, quality, useKit) {
        const { globals } = database.core;

        const [min, max] = [
            !useKit
                ? globals.config.ArmorMaterials[material].MinRepairDegradation
                : globals.config.ArmorMaterials[material].MinRepairKitDegradation,
            !useKit
                ? globals.config.ArmorMaterials[material].MaxRepairDegradation
                : globals.config.ArmorMaterials[material].MaxRepairKitDegradation
        ];
        return Number(((float(min, max) * maxDurability) * quality).toFixed(2));
    }

    static async weaponRepairDegradation(props, maxDurability, quality, useKit) {
        const [min, max] = [
            !useKit //set min
                ? props.MinRepairDegradation
                : props.MinRepairKitDegradation,
            !useKit //set max
                ? props.MaxRepairDegradation
                : props.MaxRepairKitDegradation === 0 //if equal 0
                    ? props.MaxRepairDegradation // fallback
                    : props.MaxRepairKitDegradation
        ];

        return Number(((float(min, max) * maxDurability) * quality).toFixed(2));
    }

    static async getKitDivisor(character, item, isArmor = null) {
        const { globals } = database.core;

        const { Progress } = await Character.getPlayerSkill(character, "Intellect");
        const reduction = globals.config.SkillsSettings.Intellect.RepairPointsCostReduction * Math.trunc(Progress ?? 0 / 100);

        if (isArmor) {
            const armorBonus = (1.0 - (await this.getBonusMultiplierValue("RepairArmorBonus", character) - 1.0) - reduction);

            const destructibility = (1 + globals.config.ArmorMaterials[item._props.ArmorMaterial].Destructibility);

            const armorClassMultiplier = (1.0 + (Number(item._props.armorClass) / globals.config.RepairSettings.armorClassDivisor));

            return globals.config.RepairSettings.durabilityPointCostArmor * armorBonus * destructibility * armorClassMultiplier;
        }
        else {
            const weaponBonus = (1.0 - (await this.getBonusMultiplierValue("RepairWeaponBonus", character) - 1.0) - reduction);
            return weaponBonus * globals.config.RepairSettings.durabilityPointCostGuns;
        }
    }

    static async getBonusMultiplierValue(skillBonusName, character) {
        const bonusesMatched = character?.Bonuses?.filter(b => b.type === skillBonusName);
        let value = 1;
        if (bonusesMatched != null) {
            const sumedPercentage = await bonusesMatched.map(async b => b.value).reduce(async (v1, v2) => v1 + v2, 0);
            value = 1 + sumedPercentage / 100;
        }

        return value;
    }

    static async decideToBuff(itemProperties, repairAmount, character) {
        const { globals } = database.core;

        if (character.Info.Level < globals.config.RepairSettings.MinimumLevelToApplyBuff) {
            return false;
        }
        const skillType = await this.getBuffType(itemProperties);
        const { CommonBuffMinChanceValue,
            CommonBuffChanceLevelBonus,
            ReceivedDurabilityMaxPercent } = globals.config.SkillsSettings[skillType].BuffSettings;

        const playerSkill = await Character.getPlayerSkill(character, skillType);
        const skillLevel = Math.trunc((playerSkill?.Progress ?? 0) / 100);

        const multiplier = await this.getDurabilityMultiplier(ReceivedDurabilityMaxPercent, (repairAmount / itemProperties.MaxDurability));

        return Math.random() <= CommonBuffMinChanceValue + CommonBuffChanceLevelBonus * skillLevel * multiplier;
    }

    static async getDurabilityMultiplier(ReceivedDurabilityMaxPercent, toRestorePercent) {
        ReceivedDurabilityMaxPercent = ((ReceivedDurabilityMaxPercent > 0) ? ReceivedDurabilityMaxPercent : 0.01);


        const num = toRestorePercent / ReceivedDurabilityMaxPercent;
        if (num > 1) {
            return 1.0;
        }
        if (num < 0.01) {
            return 0.01;
        }

        return num;
    }

    static async getBuff(toRepairUpd, isArmor) {
        const { globals } = database.core;

        const type = !isArmor
            ? globals.gamplay.repairKit["weapon"]
            : globals.gamplay.repairKit["armor"];

        const bonusRarity = getRandomFromArray(await Item.generateWeightedList(type.rarityWeight));
        const bonusType = getRandomFromArray(await Item.generateWeightedList(type.bonusTypeWeight));

        const bonusValues = type[bonusRarity][bonusType].valuesMinMax;
        const bonusValue = float(bonusValues.min, bonusValues.max);

        const bonusThresholdPercents = type[bonusRarity][bonusType].activeDurabilityPercentMinMax;
        const bonusThresholdPercent = getRandomInt(bonusThresholdPercents.min, bonusThresholdPercents.max);

        toRepairUpd.Buff = {
            rarity: bonusRarity,
            buffType: bonusType,
            value: bonusValue,
            thresholdDurability: getPercentOf(bonusThresholdPercent, toRepairUpd.Repairable.Durability)
        };
    }

    static async getBuffType(props) {
        if (props.knifeDurab) {
            return "Melee"
        }
        if (props.weapClass) {
            return "WeaponTreatment"
        }
        if (props.ArmorType) {
            if (props.ArmorType === "Light")
                return "LightVests"
            else if (props.ArmorType === "Heavy")
                return "HeavyVests"
        }
    }

}