import { database } from '../../app.mjs';

import {
    Character, Dialogues, Trader, Profile,
    Item, Inventory, Notification
} from '../classes/_index.mjs';

import {
    Response, getCurrentTimestamp, getRandomFromArray,
    getTimeDateMailFormat, getTimeMailFormat, repair,
} from "../utilities/_index.mjs";




export class RaidController {
    static async showKilledMessage(request, reply) {
        return Response.zlibJsonReply(reply, database.core.gameplay.raid.inRaid.showDeathMessage);
    }

    static async personKilled(request, reply) {
        const sessionID = await Response.getSessionID(request);

        const { killingPMCsFenceLevelChange, killingScavsFenceLevelChange } = database.core.gameplay.trading.fence;

        // if the killer is the player
        if (request.body.killedByAID === sessionID) {
            const character = Character.get(sessionID);

            if (request.body.diedFaction === "Savage" || request.body.diedFaction === "Scav")
                character.TradersInfo["579dc571d53a0658a154fbec"].standing += killingScavsFenceLevelChange;
            else if (request.body.diedFaction === "Usec" || request.body.diedFaction === "Bear")
                character.TradersInfo["579dc571d53a0658a154fbec"].standing += killingPMCsFenceLevelChange;

            await Character.save(sessionID);
        }
        return Response.zlibJsonReply(reply, {});
    }

    static async save(request, reply) {
        //const { enabled } = database.core.gameplay.bot.preload;
        await RaidController.raidProfileSave(request, reply);
        /*         if (enabled)
                    await Bot.regeneratePreloadedBots(); */
    }

    static async raidProfileSave(request, reply) {
        const { gameplay } = database.core;

        const endRaidData = await repair(request.body);
        const { Inventory: endRaidInventory } = endRaidData.Profile;

        const sessionID = await Response.getSessionID(request);
        const { character, raid } = Profile.get(sessionID);

        const [
            equipment,
            sortingTable,
            questRaidItems
        ] = [
                Inventory.getEquipmentContainer(character.Inventory),
                Inventory.getSortingTableContainer(character.Inventory),
                Inventory.getQuestRaidItemsContainer(character.Inventory)
            ];

        // save preraid items
        let preraidItems;
        if (gameplay.raid.insuranceEnabled && raid.lastLocation.insurance) {
            preraidItems = await RaidUtilities.findAllChildrenInInventory(
                character.Inventory,
                equipment
            );
        };

        await Character.saveCharacterRaidProgression(character, endRaidData);

        //clear inventory of equipment
        for (const param of [equipment, questRaidItems, sortingTable]) {
            const items = await RaidUtilities.findAllChildrenInInventory(character.Inventory, param);

            if (items.length === 0)
                continue;

            for (const item of items)
                await Inventory.removeInventoryItemByID(character.Inventory, item._id);
        }


        if (!["survived", "runner"].includes(endRaidData.ExitStatus)) {
            const itemsToAdd = await RaidUtilities.skillIssue(endRaidInventory);
            await RaidUtilities.addLootToInventory(character, itemsToAdd);
        } else {
            await RaidUtilities.addLootToInventory(character, endRaidInventory.items);
        }

        character.Inventory.fastPanel = endRaidInventory.fastPanel;

        /*         if (insuranceEnabled && raid.lastLocation.insurance) {
                    await RaidUtilities.handleInsurance(playerProfile, preraidItems, raid.lastLocation.name);
                } */

        await Profile.save(sessionID);
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
    static async skillIssue(endRaidInventory) {
        const output = [];
        const scabbard = endRaidInventory.items.find(item => item.slotId === "Scabbard");
        if (scabbard)
            output.push(scabbard); //need to check if it exists

        const securedContainer = endRaidInventory.items.find(item => item.slotId === "SecuredContainer");
        if (securedContainer) { //need to check if it exists
            output.push(securedContainer);
            const securedContainerContents = await RaidUtilities.findAllChildrenInInventory(endRaidInventory, securedContainer._id);
            if (securedContainerContents.length > 0)
                output.push(...securedContainerContents); //need to check if it exists
        };

        const pockets = endRaidInventory.items.find(item => item.slotId === "Pockets");
        if (pockets)
            output.push(pockets);
        return output;
    }

    /**
     * Handle checking pre-raid character inventory and insureditems against
     * post-raid character inventory to determine what will covered in 
     * insurance and roll for what gets returned
     * @param {obj} preraidPlayer character
     * @param {array} loot loot from raid
     * @returns 
     */
    static async handleInsurance(character, preraidItems, location) {
        const { gameplay } = database.core;

        const lostGear = preraidItems.filter((pre) =>
            character.InsuredItems.find((item) => pre._id === item.itemId));
        const traderInsurances = await this.generateTraderInsurances(lostGear, character.InsuredItems);

        // generate lostInsurance from lost gear by checking if itemId is in insured
        // potentially have Fence sell lost gear back and give `scav karma` a use
        const currentTime = getCurrentTimestamp();
        for (const trader in traderInsurances) {
            const {
                base: { insurance: { max_return_hour, min_return_hour, max_storage_time } },
                dialogue: { insuranceFound, insuranceStart }
            } = await Trader.get(trader);

            let minReturn = null;
            let maxReturn = null;
            if (gameplay.development.devInsuranceTimers) {
                minReturn = gameplay.development.devInsuranceTimes.min;
                maxReturn = gameplay.development.devInsuranceTimes.max;
            } else {
                minReturn = min_return_hour;
                maxReturn = max_return_hour;
            }

            const time = currentTime + (maxReturn * 3600, minReturn * 3600);

            /*       need completed hideout bonuses for this to work      
            const returnBonusPercent = preraidPlayer.Bonuses.find(bonus => bonus.type === "InsuranceReturnTime",
                function (bonus) {
                    return 1.0 - (bonus ? abs(bonus.value) : 0) / 100
                }) 
            */

            const traderInsureStartContent = await Dialogues.createMessageContent(
                getRandomFromArray(insuranceStart),
                2,
                max_storage_time
            );

            await Dialogues.generateTraderDialogue(
                character,
                trader,
                traderInsureStartContent
            );

            const traderInsuranceReturnContent = await this.insuranceMessageContent(
                insuranceFound,
                max_storage_time,
                location
            );

            Notification.addInsuranceNotificationToQueue(
                character.aid,
                {
                    scheduledTime: time,
                    traderId: trader,
                    messageContent: traderInsuranceReturnContent,
                    items: traderInsurances[trader]
                });
        }
    }

    static async insuranceMessageContent(insuranceFound, maxStorageTime, location) {
        return {
            templateId: getRandomFromArray(insuranceFound),
            type: 8, //messageType 8 for insurance return
            text: "",
            maxStorageTime: (maxStorageTime * 3600),
            profileChangeEvents: [],
            systemData: {
                date: await getTimeDateMailFormat(),
                time: await getTimeMailFormat(),
                location: location
            }
        };
    }

    static async generateTraderInsurances(lostGear, insured) {
        const output = [];

        for (const lost of lostGear) {
            for (const insure in insured) {
                if (insured[insure].itemId !== lost._id)
                    continue;
                if (lost.slotId) lost.slotId = "hideout";
                if (lost.location) delete lost.location;

                if (!output[insured[insure].tid])
                    output[insured[insure].tid] = [];
                output[insured[insure].tid].push(lost);

                insured.splice(insure, 1);
            }
        }

        return output;
    }

    static async findAllChildrenInInventory(inventory, parentId) {
        const items = [];
        let parentItems = await this.getItemsWithParent(inventory, parentId);
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

    static async addLootToInventory(character, listItems) {
        const inventory = character.Inventory.items;
        for (const loot of listItems) {

            if (loot.parentId) {
                if (await Inventory.getInventoryItemByID(character.Inventory, loot._id)) {
                    await Inventory.removeInventoryItemByID(character.Inventory, loot._id);
                }
                // fix rotation from string to int because BSG is retarded
                if (loot.location && loot.location.r)
                    loot.location.r = (loot.location.r === "Vertical") ? 1 : 0;

                inventory.push(loot);
            }
        }
    }

    static async removeItemsWithParent(inventory, parentId) {
        return inventory.items.filter(item => item.parentId !== parentId);
    }


    static async getItemsWithParent(inventory, parentId) {
        const path = inventory?.items ? inventory.items : inventory;
        return path.filter(item => item.parentId === parentId);
    }

}
