const { Profile } = require('../models/Profile');
const { Response, getCurrentTimestamp, getRandomFromArray, getTimeDateMailFormat, getTimeMailFormat, logger } = require("../utilities");
const { Item } = require('../models/Item');
const { Dialogue } = require('../models/Dialogue');
const { Trader } = require('../models/Trader');
const { database: { core: { gameplay: {
    development: { devInsuranceTimers, devInsuranceTimes: { min, max } },
    raid: { insuranceEnabled } } } } } = require('../../app');


class RaidController {
    static async raidProfileSave(request, reply) {
        const endRaidData = request.body;
        const { Inventory: endRaidInventory } = endRaidData.profile;

        const playerProfile = await Profile.get(await Response.getSessionID(request));
        const { character, raid } = playerProfile;

        const [
            equipment,
            sortingTable,
            questRaidItems
        ] = [
                await character.getEquipmentContainer(),
                await character.getSortingTableContainer(),
                await character.getQuestRaidItemsContainer()
            ];

        // save preraid items
        let preraidItems;
        if (insuranceEnabled && raid.lastLocation.insurance) {
            preraidItems = await RaidUtilities.findAllChildrenInInventory(
                character.Inventory,
                equipment
            );
        };

        await character.saveCharacterRaidProgression(endRaidData);

        //clear inventory of equipment
        for (const param of [equipment, questRaidItems, sortingTable]) {
            const items = await RaidUtilities.findAllChildrenInInventory(character.Inventory, param);
            for (const item of items)
                await character.removeInventoryItemByID(item._id);
        }

        if (!["survived", "runner"].includes(endRaidData.exit)) {
            const itemsToAdd = [];
            await RaidUtilities.skillIssue(endRaidInventory, itemsToAdd);
            for (const loot of itemsToAdd) {
                if (loot.parentId) {
                    const item = await Item.generateItemModel(loot);
                    character.Inventory.items.push(item);
                }
            }
        } else {
            for (const loot of endRaidInventory.items) {
                if (loot.parentId) {
                    const item = await Item.generateItemModel(loot);
                    character.Inventory.items.push(item);
                }
            }
        }

        character.Inventory.fastPanel = endRaidInventory.fastPanel;

        if (insuranceEnabled && raid.lastLocation.insurance) {
            await RaidUtilities.handleInsurance(playerProfile, preraidItems, raid.lastLocation.name);
        }

        await playerProfile.save();
        return Response.zlibJsonReply(
            reply,
            null
        );
    }
}

class RaidUtilities {

    /**
     * Remove items upon death, get fucked nerd
     * @param {[]} endRaidInventory 
     * @param {[]} itemsToAdd 
     */
    static async skillIssue(endRaidInventory, itemsToAdd) {
        const scabbard = endRaidInventory.items.find(item => item.slotId === "Scabbard");
        if (scabbard)
            itemsToAdd.push(scabbard); //need to check if it exists

        const securedContainer = endRaidInventory.items.find(item => item.slotId === "SecuredContainer");
        if (securedContainer) { //need to check if it exists
            itemsToAdd.push(securedContainer);
            const securedContainerContents = await RaidUtilities.findAllChildrenInInventory(endRaidInventory, securedContainer._id);
            if (securedContainerContents.length > 0)
                itemsToAdd.push(...securedContainerContents); //need to check if it exists
        };

        const pockets = endRaidInventory.items.find(item => item.slotId === "Pockets");
        if (pockets)
            itemsToAdd.push(pockets);
    }

    /**
     * Handle checking pre-raid character inventory and insureditems against
     * post-raid character inventory to determine what will covered in 
     * insurance and roll for what gets returned
     * @param {obj} preraidPlayer character
     * @param {array} loot loot from raid
     * @returns 
     */
    static async handleInsurance(playerProfile, preraidItems, location) {
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
                    return 1.0 - (bonus ? await abs(bonus.value) : 0) / 100
                }) 
            */

            let dialogue = await Dialogue.get(playerProfile.character.aid)
            if (!dialogue) dialogue = new Dialogue(playerProfile.character.aid);
            const traderInsureStartContent = await dialogue.createMessageContent(
                await getRandomFromArray(insuranceStart),
                2,
                max_storage_time
            );

            await dialogue.generateTraderDialogue(
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

    static async regenerateIds(item) {

    }

    static async removeItemsWithParent(inventory, parentId) {
        return inventory.items.filter(item => item.parentId !== parentId);
    }


    static async getItemsWithParent(inventory, parentId) {
        return inventory.items.filter(item => item.parentId === parentId);
    }

}

module.exports.RaidController = RaidController;
