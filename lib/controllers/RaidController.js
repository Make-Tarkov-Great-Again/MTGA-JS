const { Profile } = require('../models/Profile');
const { FastifyResponse, getCurrentTimestamp, getRandomFromArray, getTimeDateMailFormat, getTimeMailFormat } = require("../../utilities");
const { Item } = require('../models/Item');
const { Dialogue } = require('../models/Dialogue');
const { Trader } = require('../models/Trader');


class RaidController {
    static async raidProfileSave(request, reply) {
        const { database: { core: { gameplay: { raid: { inRaid: { insuranceEnabled } } } } } } = require('../../app')
        const endRaidData = request.body;
        const playerProfile = await Profile.get(await FastifyResponse.getSessionID(request));
        const { character, raid } = playerProfile;

        let preraidItems;
        if (insuranceEnabled) {
            preraidItems = await RaidUtilities.findAllChildrenInInventory(
                character.Inventory,
                character.Inventory.equipment._id
            );
        }

        await character.saveCharacterRaidProgression(endRaidData);
        const stash = await character.getStashContainer(); //get stashId
        const listStashItems = await character.generateListItemsInContainer(stash._id); // we don't want to touch items in stash
        const pockets = character.Inventory.items.find(item => item.slotId === "Pockets");

        const protecteditems = [
            await character.getEquipmentContainer(), await character.getSortingTableContainer(),
            await character.getQuestRaidItemsContainer(), await character.getQuestStashItemsContainer(),
            stash, ...listStashItems, pockets
        ];

        for (let i = character.Inventory.items.length - 1; i >= 0; i--) {
            const playerItem = character.Inventory.items[i];
            if (protecteditems.includes(playerItem)) {
                continue;
            }
            character.Inventory.items.splice(character.Inventory.items.indexOf(playerItem), 1);
        }

        const itemsToAdd = [];
        const { Inventory: endRaidInventory, Inventory: { items: endRaidItems } } = endRaidData.profile;
        if (endRaidData.exit !== "survived" && endRaidData.exit !== "runner") {
            // TODO: remove quests items
            // TODO: reset counters for quest where you have to do stuff in 1 raid (like the satellite thingy in shoreline for mechanic)

            const scabbard = endRaidItems.find(item => item.slotId === "Scabbard");
            if (scabbard) itemsToAdd.push(scabbard); //need to check if it exists

            const securedContainer = endRaidItems.find(item => item.slotId === "SecuredContainer");
            if (securedContainer) itemsToAdd.push(securedContainer); //need to check if it exists

            if (securedContainer) { //need to check if it exists
                const securedContainerContents = await RaidUtilities.findAllChildrenInInventory(endRaidInventory, endRaidItems.find(item => item.slotId === "SecuredContainer")._id);
                if (securedContainerContents.length > 0) itemsToAdd.push(...securedContainerContents); //need to check if it exists
            }
        } else {
            for (const item of endRaidData.profile.Inventory.items) {
                if (item.parentId && item.slotId !== "Pockets") {
                    itemsToAdd.push(item);
                }
            }
        }

        // insurance to be handle after we have gotten all the items situated
        if (insuranceEnabled) await RaidUtilities.handleInsurance(playerProfile, preraidItems, raid.lastLocation.name);

        for (const item of itemsToAdd) {
            const itemTemplate = await Item.get(item._tpl);
            const newItem = await itemTemplate.createAsNewItem();
            newItem._id = item._id;
            if (item.parentId) {
                newItem.parentId = item.parentId;
            }
            if (item.slotId) {
                newItem.slotId = item.slotId;
            }
            if (item.upd) {
                newItem.upd = item.upd;
            }
            if (item.location) {
                newItem.location = item.location;
            }

            character.Inventory.items.push(newItem);
        }

        await playerProfile.save();
        return FastifyResponse.zlibJsonReply(
            reply,
            null
        );
    }
}

class RaidUtilities {

    /**
     * Handle checking pre-raid character inventory and insureditems against
     * post-raid character inventory to determine what will covered in 
     * insurance and roll for what gets returned
     * @param {obj} preraidPlayer character
     * @param {array} loot loot from raid
     * @returns 
     */
    static async handleInsurance(playerProfile, preraidItems, location) {
        const { database: { core: { gameplay: { development: { devInsuranceTimers, devInsuranceTimes: { min, max } } } } } } = require('../../app');
        const lostGear = preraidItems.filter((pre) =>
            playerProfile.character.InsuredItems.find((item) => pre._id === item.itemId));
        const traderInsurances = await this.generateTraderInsurances(lostGear, playerProfile.character.InsuredItems)

        // generate lostInsurance from lost gear by checking if itemId is in insured
        // potentially have Fence sell lost gear back and give `scav karma` a use


        for (const trader in traderInsurances) {
            const {
                base: { insurance: { max_return_hour, min_return_hour, max_storage_time } },
                dialogue: { insuranceFound, insuranceStart }
            } = await Trader.get(trader);

            let minReturn = null;
            let maxReturn = null;
            if (devInsuranceTimers) {
                minReturn = min;
                maxReturn = max;
            } else {
                minReturn = min_return_hour;
                maxReturn = max_return_hour;
            }

            const time = await getCurrentTimestamp() + (maxReturn * 3600, minReturn * 3600);

            /*       need completed hideout bonuses for this to work      
            const returnBonusPercent = preraidPlayer.Bonuses.find(bonus => bonus.type === "InsuranceReturnTime",
                function (bonus) {
                    return 1.0 - (bonus ? Math.abs(bonus.value) : 0) / 100
                }) 
            */

            let dialogue = await Dialogue.get(playerProfile.character.aid)
            if (!dialogue) dialogue = new Dialogue(playerProfile.character.aid);
            const traderInsureStartContent = await dialogue.createMessageContent(
                await getRandomFromArray(insuranceStart),
                2,
                max_storage_time
            );

            await dialogue.generateDialogue(
                trader,
                traderInsureStartContent,
                playerProfile.character.aid
            );

            const traderInsuranceReturnContent = await this.insuranceMessageContent(
                insuranceFound,
                max_storage_time,
                location
            );

            playerProfile.addInsuranceNotificationToQueue({
                scheduledTime: time,
                traderId: trader,
                messageContent: traderInsuranceReturnContent,
                items: traderInsurances[trader]
            });
        }
    }

    static async insuranceMessageContent(insuranceFound, max_storage_time, location) {
        return {
            templateId: await getRandomFromArray(insuranceFound),
            type: 8, //messageType 8 for insurance return
            text: "",
            maxStorageTime: (max_storage_time * 3600),
            profileChangeEvents: [],
            systemData: {
                date: await getTimeDateMailFormat(),
                time: await getTimeMailFormat(),
                location: location
            }
        }
    }

    static async generateTraderInsurances(lostGear, insured) {
        const output = [];

        for (const lost of lostGear) {
            for (const insure in insured) {
                if (insured[insure].itemId === lost._id) {
                    if (lost.slotId) lost.slotId = "hideout";
                    if (lost.location) delete lost.location;

                    if (!output[insured[insure].tid]) {
                        output[insured[insure].tid] = [];
                        output[insured[insure].tid].push(lost);
                    } else {
                        output[insured[insure].tid].push(lost);
                    }

                    insured.splice(insure, 1);
                }
            }
        }

        return output;
    }

    static async findAllChildrenInInventory(inventory, containerId) {
        const items = [];
        let parentItems = await this.getItemsWithParent(inventory, containerId);
        while (parentItems.length > 0) {
            const childrenList = [];
            items.push(...parentItems);
            for (const item of parentItems) {
                childrenList.push(...await this.getItemsWithParent(inventory, item._id));
            }
            if (childrenList.length > 0) {
                parentItems = childrenList;
            } else {
                parentItems = [];
            }
        }
        return items;
    }

    static async getItemsWithParent(inventory, parentId) {
        return inventory.items.filter(item => item.parentId === parentId);
    }
}

module.exports.RaidController = RaidController;
