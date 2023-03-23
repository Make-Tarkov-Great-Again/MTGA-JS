import { database } from "../../app.mjs";
import { generateMongoID, cloneDeep, getRandomInt, logger, writeFile, stringify } from "../utilities/_index.mjs";
import { Item } from "./Item.mjs";

export class Wave {
    constructor() {
        this.number = 0;
        this.time_min = 55;
        this.time_max = 100;
        this.slots_min = 1;
        this.slots_max = 2;
        this.SpawnPoints = "OpenZone";
        this.BotSide = "Savage";
        this.BotPreset = "Difficulty";
        this.WildSpawnType = "assault";
        this.isPlayers = false;
        this.OpenZones = "";
    }
}

export class BossLocationSpawn {
    constructor() {
        this.BossName = null;
        this.BossChance = 0;
        this.BossZone = "OpenZone";
        this.BossPlayer = false;
        this.BossDifficult = "normal";
        this.BossEscortType = "exUsec";
        this.BossEscortDifficult = "normal";
        this.BossEscortAmount = "2";
        this.Time = -1;
        this.Supports = [];
        this.RandomTimeSpawn = true;
    }

    async setSupports(supports) {

        return [{
            "BossEscortType": "followerBigPipe",
            "BossEscortDifficult": [
                "normal"
            ],
            "BossEscortAmount": "1"
        },
        {
            "BossEscortType": "followerBirdEye",
            "BossEscortDifficult": [
                "normal"
            ],
            "BossEscortAmount": "1"
        },
        {
            "BossEscortType": "followerGluharScout",
            "BossEscortDifficult": [
                "normal"
            ],
            "BossEscortAmount": "0"
        }]
    }
}

/**
 * @param Id
 * @param Position
 * @param Rotation
 * @param Sides Factions/Sides that can Spawn here, reference SIDES
 * @param Categories 
 * @param Infiltration Unknown (Can be Empty String)
 * @param DelayToCanSpawnSec Spawn Delay Time
 * @param ColliderParams SphereCollider Transform for SpawnSphere (Only Radius/Size is Adjusted)
 * @param ColliderParams.Radius Seen 60-80
 * @param BotZoneName
 */
export class SpawnPointParams {
    constructor() {
        this.Id = generateMongoID;
        this.Position = {
            x: 0,
            y: 0,
            z: 0
        };
        this.Rotation = 0;
        this.Sides = [
            "Usec",
            "Bear"
        ];
        this.Categories = [
            "Player"
        ];
        this.Infiltration = "";
        this.DelayToCanSpawnSec = 4;
        this.ColliderParams = {
            _parent: "SpawnSphereParams",
            _props: {
                Center: {
                    x: 0,
                    y: 0,
                    z: 0
                },
                Radius: 70
            }
        };
        this.BotZoneName = "";
    }

    /**
     * REF: ESpawnCategoryMask
     */
    CATEGORIES = {
        None: 0,
        Player: 1,
        Bot: 2,
        Boss: 4,
        Coop: 8,
        Group: 16,
        Opposite: 32,
        All: 7
    }

    /**
     * REF: EPlayerSideMask
     */
    SIDES = {
        None: 0,
        Usec: 1,
        Bear: 2,
        Savage: 4,
        Pmc: 3,
        All: 7
    }

    SPAWNTRIGGERTYPE =
        {
            none,
            interactObject,
            byQuest
        }

}

export class Loot { }

export class Location {

    static get(name) {
        return database.locations[name];
    }

    static getMapWaves() { return; }
    async regenerateLocation(mapName) {
        const location = await Location.get(mapName);
        const output = await location.generateBase();

        await Promise.allSettled([
            // location data generation
            location.prepareSpawnPoints(output),
            location.prepareExits(output),
            location.prepareBotWaves(output),
            location.prepareBossWaves(output),
        ]);
    }

    async adjustLocationSettings() {
        /**
         * Dynamic raid timers
         */
        return;
    }

    async prepareExits(output) {
        //output.exits = this.exits;
        //return output;
        return;
    }
    static addCustomSpawn(location, spawn) { return; }

    static async BSG_ConvertDataToDynamicLoot(item_data) {
        // preseted values aka Default ones of the value not exist this one will be placed instead
        let isStatic = false;
        let useGravity = false;
        let randomRotation = false;
        let position = { x: 0, y: 0, z: 0 };
        let rotation = { x: 0, y: 0, z: 0 };
        let IsGroupPosition = false;
        let GroupPositions = [];

        // checks for not existing values to use default ones
        if (typeof item_data.IsStatic != "undefined") isStatic = item_data.IsStatic;
        if (typeof item_data.useGravity != "undefined")
            useGravity = item_data.useGravity;
        if (typeof item_data.randomRotation != "undefined")
            randomRotation = item_data.randomRotation;
        if (item_data.Position != 0 && item_data.Position != "0") {
            position.x = item_data.Position[0];
            position.y = item_data.Position[1];
            position.z = item_data.Position[2];
        }
        if (typeof item_data.Rotation == "undefined") {
            rotation.x = 0;
            rotation.y = 0;
            rotation.z = 0;
        } else {
            if (item_data.Rotation != 0 && item_data.Rotation != "0") {
                rotation.x = item_data.Rotation[0];
                rotation.y = item_data.Rotation[1];
                rotation.z = item_data.Rotation[2];
            }
        }

        if (typeof item_data.IsGroupPosition != "undefined") {
            IsGroupPosition = item_data.IsGroupPosition;
            GroupPositions = item_data.GroupPositions;
        }
        // if you want you can remove Root ID it will be recreated from first object of Items array
        let Root = "";
        if (typeof item_data.Items != "undefined") {

            Root =
                typeof item_data.Items[0] == "string"
                    ? item_data.id
                    : item_data.Items[0]._id;
        }
        let ItemsData = typeof item_data.Items == "undefined"
            ? []
            : item_data.Items;
        // return prepared data
        return {
            Id: item_data.worldId,
            IsStatic: isStatic,
            useGravity: useGravity,
            randomRotation: randomRotation,
            Position: position,
            Rotation: rotation,
            IsGroupPosition: IsGroupPosition,
            GroupPositions: GroupPositions,
            Root: Root, // id of container
            Items: ItemsData,
        };
    }
    // converts shortened Dynamic and Forced loot templates from file format ot BSG format
    static async BSG_ConvertDataToStaticLoot(item_data) {
        // preseted values aka Default ones of the value not exist this one will be placed instead
        let isStatic = false;
        let useGravity = false;
        let randomRotation = false;
        let position = { x: 0, y: 0, z: 0 };
        let rotation = { x: 0, y: 0, z: 0 };
        let IsGroupPosition = false;
        let GroupPositions = [];

        // checks for not existing values to use default ones
        if (typeof item_data.IsStatic != "undefined") isStatic = item_data.IsStatic;
        if (typeof item_data.useGravity != "undefined")
            useGravity = item_data.useGravity;
        if (typeof item_data.randomRotation != "undefined")
            randomRotation = item_data.randomRotation;

        if (item_data.Position != 0 && item_data.Position != "0") {
            position.x = item_data.Position.x;
            position.y = item_data.Position.y;
            position.z = item_data.Position.z;
        }
        if (item_data.Rotation != 0 && item_data.Rotation != "0") {
            rotation.x = item_data.Rotation.x;
            rotation.y = item_data.Rotation.y;
            rotation.z = item_data.Rotation.z;
        }
        if (typeof item_data.IsGroupPosition != "undefined") {
            IsGroupPosition = item_data.IsGroupPosition;
            GroupPositions = item_data.GroupPositions;
        }
        let Root =
            typeof item_data.Items[0] == "string"
                ? item_data.id
                : item_data.Items[0]._id;
        // return prepared data
        return {
            Id: item_data.id,
            IsStatic: isStatic,
            useGravity: useGravity,
            randomRotation: randomRotation,
            Position: position,
            Rotation: rotation,
            IsGroupPosition: IsGroupPosition,
            GroupPositions: GroupPositions,
            Root: Root,
            Items: item_data.Items
        };
    }
    static async BSG_DefaultLootStructure() {
        return {
            Id: "",
            IsStatic: false,
            useGravity: false,
            randomRotation: false,
            Position: { x: 0, y: 0, z: 0 },
            Rotation: { x: 0, y: 0, z: 0 },
            IsGroupPosition: false,
            GroupPositions: [],
            Root: "",
            Items: []
        };
    }

    /**
     * Generation of Location with randomized options
     * @param {*} mapName name of the map such as bigmap, factory4_day etc.
     * @returns output for client to get
     */
    static async generateLocationData(mapName) {
        const location = Location.get(mapName);
        const output = await this.generateBase(location);

        await Promise.allSettled([
            // loot generation
            this.generateStaticLoot(location, output),
            this.generateLooseLoot(location, output),
            this.generateQuestLoot(location, output),
            this.generateWeaponsLoot(location, output)
        ])

        return output;
    }
    /**
     * Create Location Base
     * @param {*} output response to client
     * @returns 
     */
    static async generateBase(location) {
        return cloneDeep(location.base);
    }

    /**
     * Not used yet - Discern based on verious stats if item is rare commor etc.
     * @param {*} itemTemplate 
     * @returns 
     */
    static async _GetItemRarityType(itemTemplate) {
        const backgroundColor = itemTemplate._props.BackgroundColor;
        const itemExperience = itemTemplate._props.LootExperience;
        const examineExperience = itemTemplate._props.ExamineExperience;
        const unlootable = itemTemplate._props.Unlootable;

        let itemRarityType = "COMMON";

        if (unlootable) {
            itemRarityType = "NOT_EXIST";
        } else {
            if (itemExperience >= 45
                || backgroundColor == "violet" // violet is good shit
                // the good keys and stuff are high examine
                || examineExperience >= 20
                || itemTemplate._props.Name.includes("key")
                || itemTemplate._props.Name.includes("Key")
            ) {
                itemRarityType = "SUPERRARE";
            } else if (itemExperience >= 40 || examineExperience >= 15) {
                itemRarityType = "RARE";
            } else if (itemExperience >= 20 || examineExperience >= 8) {
                itemRarityType = "UNCOMMON";
            }
        }
        return itemRarityType;
    }
    /**
     * Simplifies the names of spawn loots to easly recognise what they really are, such as "Spawn_med (1)-12307234" will be represented as "Spawn_med"
     * @param {*} worldId a string value as World Id of spawn point
     * @returns 
     */
    static async ID_Simplifier(worldId) {
        let name = worldId
        name = name.replace(/[\(\)\[\]0-9- ]{1,99}/g, "");
        name = name.replace("__", "");
        return name;
    }
    /**
     * Loot generation works as follows it grabs container then spawndata for container and attempts to roll amounts of items
     *  to spawn by height of container (rolls 0,height)
     * Then we are rolling 0,50 and checking which items are available to spawn by comparing that roll to LootExperience
     * @param {*} data supplied data that will be added to output later on.
     * @returns 
     */
    static async generateContainerContents(data) {
        const lootGenData = Location.get("lootGen");
        const container = data.Items[0];
        const containerTable = lootGenData.containers[container._tpl];
        if (containerTable == null) {
            logger.error(`Container: ${container._tpl} not found in conrainersSpawnData.json`);
            return data;
        }
        let containerTemplate = Item.get(container._tpl);
        let SpawnList = {}

        const containerHeight = containerTemplate._props.Grids[0]._props.cellsV // height
        const itemToSpawn = getRandomInt(0, containerHeight); // for now lets use the height as max items to spawn

        for (let spawningTpl of containerTable.SpawnList) {
            const itemData = Item.get(spawningTpl);
            SpawnList[spawningTpl] = itemData._props.LootExperience;
        }

        for (let i = 0; i < itemToSpawn; i++) {
            const roll = getRandomInt(0, 50);
            const smallList = [];

            for (const templateId in SpawnList) {
                if (SpawnList[templateId] >= roll) {
                    smallList.push(templateId);
                }
            }
            if (smallList.length > 0) {
                const itemToAdd = smallList[getRandomInt(0, smallList.length - 1)];
                const containerMap = await Item.generateContainerMap(container, data.Items);
                const item = await Item.createAsNewItemWithParent(itemToAdd, data.Items[0]._id);
                const itemSize = await Item.getSize(item);

                const freeSlot = await Item.getFreeSlot(
                    containerMap,
                    itemSize
                );

                if (!freeSlot) {
                    logger.info(`Unable to add item ${itemToAdd}. No space. Already added ${i}`);
                    break;
                }

                item.slotId = freeSlot.slotId;
                item.location = {
                    x: freeSlot.x,
                    y: freeSlot.y,
                    r: freeSlot.r
                };
                data.Items.push(item);
            }
        }
        return data;
    }
    /**
     * A function to generate static container with loot - its used in such way to speedup caluclation of multiple instances of container generation at the same time
     * @param {*} lootSpawn spawn data saved on disk
     * @param {*} output response to client
     */
    static async gsl_loopWalker(lootSpawn, output) {
        const newId = generateMongoID();
        let data = await this.BSG_DefaultLootStructure();
        data.IsStatic = true;
        data.useGravity = true;
        data.Id = lootSpawn.worldId;
        data.Items.push({ _id: newId, _tpl: lootSpawn.containerTpl });
        data.Root = newId;
        // generate specific container loot here !!!
        data = await this.generateContainerContents(data);
        // push result to output
        if (data == null) logger.warn(lootSpawn.worldId);
        output.Loot.push(data);
    }
    /**
     * Generate static containers on map
     * @param {*} output 
     */
    static async generateStaticLoot(location, output) {
        let containers = location.lootSpawns.containers;
        let spawnPromises = [];
        for (const container of containers) {
            spawnPromises.push(this.gsl_loopWalker(container, output))
        }
        await Promise.allSettled(spawnPromises)

    }
    /**
     * Generate quests as well as forced spawns. Spawns that has 100% spawn chance
     * @param {*} output response to client
     */
    static async generateQuestLoot(location, output) {
        const quests = location.lootSpawns.quests;
        const spawnedPromises = [];
        for (const quest of quests) {
            spawnedPromises.push(this.ql_loopWalker(quest, output));
        }
        await Promise.allSettled(spawnedPromises);
    }

    static async ql_loopWalker(quest, output) {
        const newId = generateMongoID();
        let data = await this.BSG_DefaultLootStructure();
        data.Id = quest.worldId;
        if (typeof quest.Position != "undefined") {
            data.Position.x = quest.Position[0];
            data.Position.y = quest.Position[1];
            data.Position.z = quest.Position[2];
        }
        if (typeof quest.Rotation != "undefined") {
            data.Rotation.x = quest.Rotation[0];
            data.Rotation.y = quest.Rotation[1];
            data.Rotation.z = quest.Rotation[2];
        }
        data.Items.push({ _id: newId, _tpl: quest.questItmTpl });
        data.Root = newId;

        output.Loot.push(data);
    }

    /**
     * A function to generate stationary weapon  - function used in pararel in forloop
     * @param {*} weapon 
     * @param {*} output 
     * @param {*} lootGenData 
     * @returns 
     */
    static async gwl_loopWalker(weapon, output, lootGenData) {
        // detect what weapon it is
        let WeaponData;
        for (const name in lootGenData.staticWeapons) {
            if (weapon.worldId.toLowerCase().includes(name)) {
                WeaponData = lootGenData.staticWeapons[name];
                break;
            }
        }
        if (typeof WeaponData == "undefined") {
            logger.error(`WeaponData wasnt obtained for: ${weapon.worldId}`)
            return;
        }
        // generating ID's
        const newId = generateMongoID();
        const magazineId = generateMongoID();
        // get static BASE structure of loot
        let data = await this.BSG_DefaultLootStructure();
        // Set defaults for stationary weapon
        data.Root = newId;
        data.Id = weapon.worldId;
        data.IsStatic = true;
        data.useGravity = true;
        data.Items = [];
        // Main weapon
        data.Items.push({
            "_id": newId,
            "_tpl": weapon.weaponTpl,
            "upd": { "FireMode": { "FireMode": "fullauto" } }
        });
        // Magazine
        data.Items.push({
            "_id": magazineId,
            "_tpl": WeaponData.magazine,
            "parentId": newId,
            "slotId": "mod_magazine"
        });
        // Scope if it is present in WeaponData
        if (typeof WeaponData.scope != "undefined") {
            data.Items.push({
                "_id": generateMongoID(),
                "_tpl": WeaponData.scope,
                "parentId": newId,
                "slotId": "mod_scope"
            });
        }

        // Ammunition put inside a stationary weapon
        for (let cnt = 0; cnt < WeaponData.totalAmmoSlots; cnt++) {
            // decide which one to use by using modulo of ammo amount in template
            let modulo = cnt % WeaponData.cartridges.length;
            // just incase if something breaks put position "0"
            if (modulo >= WeaponData.cartridges.length) modulo = 0;
            // selecting the cartrige/ammo
            const selectedCartriges = WeaponData.cartridges[modulo];

            //adding main ammo/cartrige template with all changable data
            let ammoData = {
                "_id": generateMongoID(),
                "_tpl": selectedCartriges.template,
                "parentId": magazineId,
                "slotId": "cartridges"
            }
            // add StackObjectsCount if number of ammo is more then 1
            if (selectedCartriges.countPer > 1) {
                ammoData['upd'] = { "StackObjectsCount": selectedCartriges.countPer }
            }
            // add location of ammo in magazine if "cnt" is greater then "0"
            if (cnt > 0) {
                ammoData["location"] = cnt;
            }
            // populate the stack
            data.Items.push(ammoData);
        }
        output.Loot.push(data);
    }

    /**
     * Generate static weaponary on the map such as machine gun or granade launcher
     * @param {*} output response to client
     */
    static async generateWeaponsLoot(location, output) {
        //stationary generation of the weapon !!!
        const lootGenData = Location.get("lootGen");
        let weapons = location.lootSpawns.weapons;

        let spawnedPromises = [];
        for (const weapon of weapons) {
            spawnedPromises.push(this.gwl_loopWalker(weapon, output, lootGenData));
        }
        await Promise.allSettled(spawnedPromises);
    }

    /**
     * A function to generate dynamic loose loot - its used in such way to speedup caluclation of multiple instances of generation at the same time
     * @param {*} lootSpawn spawn data saved on disk
     * @param {*} output response to client
     */
    static async gll_loopWalker(spawnTable, lootSpawn, output) {
        if (Object.keys(spawnTable).length === 0) {
            logger.error(`SpawnTable '${generateSimpleName}' in map ${output.Name} is empty please add more variations, skipping...`);
            return;
        }
        const generateSimpleName = await this.ID_Simplifier(lootSpawn.worldId);
        let generatedBsgLootSpawnStruct = await this.BSG_ConvertDataToDynamicLoot(lootSpawn);
        //upsie something goes wrong and i cant find the loot to load, skip that bitch
        if (typeof spawnTable[generateSimpleName] == "undefined") {
            logger.error(`SpawnTable not found for ${generateSimpleName} with WorldId: ${lootSpawn.worldId}, skipping...`);
            console.log(`SNIPPET CODE FOR QUICK ADDING INTO THE availableSpawns.json for map ${output.Name}\n"${generateSimpleName}": [],`)
            return;
        }
        const ItemSpawnTable = spawnTable[generateSimpleName]; // SpawnTable of items that can be spawned
        const chooseRandomIndex = getRandomInt(0, ItemSpawnTable.length - 1); // generate random location of spawned item from table above

        // make sure something is not fucked here so if length is > or < then 0 just skip that part...
        // lootspawn shouldnt have that anyway...
        if (generatedBsgLootSpawnStruct.Items.length == 0) {
            const template = Item.get(ItemSpawnTable[chooseRandomIndex]);
            const roll = getRandomInt(0, 50);
            if (template._props.LootExperience >= roll) {
                // maybe add here a loop to go back a few times to spawn items like 2-3 times at same space if not populated...
                return;
            }
            const item = await Item.createAsNewItem(template._id);
            generatedBsgLootSpawnStruct.Root = item._id;
            generatedBsgLootSpawnStruct.Items.push(item);
            output.Loot.push(generatedBsgLootSpawnStruct);
        }
    }
    /**
     * Generate loose loot on the map
     * @param {*} output response to client
     */
    static async generateLooseLoot(location, output) {
        const looseLoot = location.lootSpawns.dynamic;

        let spawnedPromises = [];
        for (let lootSpawn of looseLoot) {
            spawnedPromises.push(this.gll_loopWalker(location.dynamicAvailableSpawns, lootSpawn, output));
        }
        await Promise.allSettled(spawnedPromises)
    }
}