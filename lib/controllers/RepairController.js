const { Trader } = require('../models/Trader');
const { Item } = require('../models/Item');

const { logger, round, min, max, float, getPercentOf, getRandomInt, getRandomFromArray } = require("../utilities");
const { database: {
    core: {
        gameplay: { skills: { repairKit } },
        globals: {
            config: {
                RepairSettings,
                SkillsSettings,
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

        const item = await Item.get(itemToRepair._tpl);

        await Durability.updateItemDurability(playerProfile.character, itemToRepair, item, toRepair, 1, true);
        output.items.change.push(itemToRepair);

        for (const kit of repairKits) {
            const repairKit = await playerProfile.character.getInventoryItemByID(kit._id);
            if (repairKit)
                repairKit.upd.RepairKit.Resource -= toRepair;

            output.items.change.push(repairKit);
        }

        // 5422acb9af1c889c16000029 weapon parentId
        const node = await ItemNode.getNodeChildrenById("5422acb9af1c889c16000029")
        if (node.find(x => item._parent === x.id)) {
            await Quest.processSkillPoints(output, playerProfile.character, "WeaponTreatment", SkillsSettings.WeaponTreatment.SkillPointsPerRepair);
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
            const item = await Item.get(itemToRepair._tpl);

            const coef = 1 + ((loyaltyLevels[loyalty].repair_price_coef) / 100);
            let repairCost = await round(item._props.RepairCost * repairAmount * coef);


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

            await Durability.updateItemDurability(playerProfile.character, itemToRepair, item, repairAmount, repair.quality, false)
            output.items.change.push(itemToRepair);
        }
        return output;
    }

}

class Durability {
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

    static async getKitDivisor(character, item, isArmor = null) {
        const { Progress } = await character.getPlayerSkill("Intellect");
        const reduction = SkillsSettings.Intellect.RepairPointsCostReduction * Math.trunc(Progress ?? 0 / 100);

        if (isArmor) {
            const armorBonus = (1.0 - (await this.getBonusMultiplierValue("RepairArmorBonus", character) - 1.0) - reduction);

            const destructibility = (1 + ArmorMaterials[item._props.ArmorMaterial].Destructibility);

            const armorClassMultiplier = (1.0 + (Number(item._props.armorClass) / RepairSettings.armorClassDivisor));

            return RepairSettings.durabilityPointCostArmor * armorBonus * destructibility * armorClassMultiplier;
        }
        else {
            const weaponBonus = (1.0 - (await this.getBonusMultiplierValue("RepairWeaponBonus", character) - 1.0) - reduction);
            return weaponBonus * RepairSettings.durabilityPointCostGuns;
        }
    }

    static async getBonusMultiplierValue(skillBonusName, character) {
        const bonusesMatched = character?.Bonuses?.filter(b => b.type === skillBonusName);
        let value = 1;
        if (bonusesMatched != null) {
            const sumedPercentage = bonusesMatched.map(b => b.value).reduce((v1, v2) => v1 + v2, 0);
            value = 1 + sumedPercentage / 100;
        }

        return value;
    }

    static async decideToBuff(itemProperties, repairAmount, character) {
        if (character.Info.Level < RepairSettings.MinimumLevelToApplyBuff) {
            return false;
        }
        const skillType = await this.getBuffType(itemProperties);
        const { CommonBuffMinChanceValue,
            CommonBuffChanceLevelBonus,
            ReceivedDurabilityMaxPercent } = SkillsSettings[skillType].BuffSettings;

        const skillLevel = Math.trunc((await character.getPlayerSkill(skillType)?.Progress ?? 0) / 100);

        const multiplier = await this.getDurabilityMultiplier(ReceivedDurabilityMaxPercent, (repairAmount / itemProperties.MaxDurability));

        return CommonBuffMinChanceValue + CommonBuffChanceLevelBonus * skillLevel * multiplier;
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
        const type = !isArmor
            ? repairKit["weapon"]
            : repairKit["armor"];

        const bonusRarity = await getRandomFromArray(await Item.generateWeightedList(type.rarityWeight));
        const bonusType = await getRandomFromArray(await Item.generateWeightedList(type.bonusTypeWeight));

        const bonusValues = type[bonusRarity][bonusType].valuesMinMax;
        const bonusValue = await float(bonusValues.min, bonusValues.max);

        const bonusThresholdPercents = type[bonusRarity][bonusType].activeDurabilityPercentMinMax;
        const bonusThresholdPercent = await getRandomInt(bonusThresholdPercents.min, bonusThresholdPercents.max);

        toRepairUpd.Buff = {
            rarity: bonusRarity,
            buffType: bonusType,
            value: bonusValue,
            thresholdDurability: await getPercentOf(bonusThresholdPercent, toRepairUpd.Repairable.Durability)
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
module.exports.Durability = Durability;
module.exports.RepairController = RepairController;