//const { logger, generateMongoID, wipeDepend, getRandomInt } = require("../utilities/index.mjs").default;
const { cloneDeep } = require("../utilities/_index.mjs");
const { BaseModel } = require("./BaseModel");
const { Item } = require("./Item");
//const { database: { locations } } = require("../../app");

class Location extends BaseModel {
  constructor(id) {
    super();

    this.createDatabase(id);
  }

  // converts shortened Dynamic and Forced loot templates from file format ot BSG format
  async BSG_ConvertDataToDynamicLoot(item_data) {
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
    return cloneDeep({
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
    });
  }
  // converts shortened Dynamic and Forced loot templates from file format ot BSG format
  async BSG_ConvertDataToStaticLoot(item_data) {
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
  async BSG_DefaultLootStructure() {
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
  async regenerateLocation() {
    await this.adjustLocationSettings();
    await this.generateBotSpawns();
    //await this.generateLoot();
  }

  async adjustLocationSettings() {
    /**
     * Dynamic raid timers
     */
  }

  async prepareExits(output) {
    //output.exits = this.exits;
    //return output;
  }

  async prepareBotWaves(output) {
    output.waves = this.waves;
    //return output;
  }

  async prepareBossWaves(output) {
    output.BossLocationSpawn = this.bossWaves;
    //return output;
  }

  async prepareSpawnPoints(output) {
    //SpawnPointParams generated
    //output.SpawnPointParams = this.spawnPoints;
    //return output;
  }

  /**
   * Generation of Location with randomized options
   * @param {*} mapName name of the map such as bigmap, factory4_day etc.
   * @returns output for client to get
   */
  static async generateLocationData(mapName) {
    let output = {}
    const location = await Location.get(mapName);

    output = await location.generateBase();

    await Promise.all([
      // location data generation
      location.prepareSpawnPoints(output),
      location.prepareExits(output),
      location.prepareBotWaves(output),
      location.prepareBossWaves(output),
      // loot generation
      location.generateStaticLoot(output),
      location.generateLooseLoot(output),
      location.generateQuestLoot(output),
      location.generateWeaponsLoot(output)
    ]);
    return output;
  }
/**
 * Create Location Base
 * @param {*} output response to client
 * @returns 
 */
  async generateBase(output) {
    return cloneDeep(this.base);
  }
  /**
   * Not used yet - Discern based on verious stats if item is rare commor etc.
   * @param {*} itemTemplate 
   * @returns 
   */
  async _GetItemRarityType(itemTemplate) {
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
  async ID_Simplifier(worldId)
  {
    let name = worldId
        name = name.replace(/[\(\)\[\]0-9- ]{1,99}/g ,"");
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
  async generateContainerContents(data) {
    const lootGenData = await Location.get("lootGen");
    const containerId = data.Items[0]._tpl;
    const containerTable = lootGenData.containersSpawnData[containerId];
    if(containerTable == null){
      await logger.error(`Container: ${containerId} not found in conrainersSpawnData.json`);
      return data;
    }
    const containerTemplate = await Item.get(containerId);
    let SpawnList = {}
    const containerWidth = containerTemplate._props.Grids[0]._props.cellsH // width
    const containerHeight = containerTemplate._props.Grids[0]._props.cellsV // height

    const itemToSpawn = getRandomInt(0, containerHeight); // for now lets use the height as max items to spawn

    for (let spawningTpl of containerTable.SpawnList) {
      SpawnList[spawningTpl] = await Item.get(spawningTpl);
    }
    for (let i = 0; i < itemToSpawn; i++) {
      const roll = getRandomInt(0, 50);
      let smallList = [];
      for (let templateId in SpawnList) {
        if (SpawnList[templateId]._props.LootExperience >= roll) {
          smallList.push(templateId);
        }
      }
      if (smallList.length > 0) {
        const itemToAdd = smallList[getRandomInt(0, smallList.length - 1)];
        let item = await SpawnList[itemToAdd].createAsNewItem();
        const freeSlot = await Item.getFreeSlot(
          data.Items[0],
          data.Items,
          SpawnList[itemToAdd]._props.Width,
          SpawnList[itemToAdd]._props.Height
        );
        if (!freeSlot) {
          logger.info(`Unable to add item ${itemToAdd}. No space. Already added ${i}`);
          break;
        }
        item.parentId = data.Items[0]._id;
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
  async gsl_loopWalker(lootSpawn, output) {
    const newId = await generateMongoID();
    let data = await this.BSG_DefaultLootStructure();
    data.IsStatic = true;
    data.useGravity = true;
    data.Id = lootSpawn.worldId;
    data.Items.push({ _id: newId, _tpl: lootSpawn.containerTpl });
    data.Root = newId;
    // generate specific container loot here !!!
    data = await this.generateContainerContents(data);
    // push result to output
    if(data == null) console.log(lootSpawn.worldId);
    output.Loot.push(data);
  }
/**
 * Generate static containers on map
 * @param {*} output 
 */
  async generateStaticLoot(output) {
    let containers = this.lootSpawns.containers;
    let spawnPromises = [];
    for (const container of containers) {
      spawnPromises.push(this.gsl_loopWalker(container, output))
    }
    await Promise.all(spawnPromises)

  }
/**
 * Generate quests as well as forced spawns. Spawns that has 100% spawn chance
 * @param {*} output response to client
 */
  async generateQuestLoot(output) {
    let quests = this.lootSpawns.quests;

    let loopWalker = async (quest, output) => {
      const newId = await generateMongoID();
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
    };

    let spawnedPromises = [];
    for (const quest of quests) {
      spawnedPromises.push(loopWalker(quest, output));
    }
    await Promise.all(spawnedPromises)

  }
/**
 * A function to generate stationary weapon  - function used in pararel in forloop
 * @param {*} weapon 
 * @param {*} output 
 * @param {*} lootGenData 
 * @returns 
 */
  async gwl_loopWalker(weapon, output, lootGenData)
  {
    // detect what weapon it is
    let WeaponData;
    for (const name in lootGenData.staticWeaponData) {
      if (weapon.worldId.toLowerCase().includes(name)) {
        WeaponData = lootGenData.staticWeaponData[name];
        break;
      }
    }
    if (typeof WeaponData == "undefined") {
      await logger.error(`WeaponData wasnt obtained for: ${weapon.worldId}`)
      return;
    }
    // generating ID's
    const newId = await generateMongoID();
    const magazineId = await generateMongoID();
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
        "_id": await generateMongoID(),
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
        "_id": await generateMongoID(),
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
  async generateWeaponsLoot(output) {
    //stationary generation of the weapon !!!
    const lootGenData = await Location.get("lootGen");
    let weapons = this.lootSpawns.weapons;

    let spawnedPromises = [];
    for (const weapon of weapons) {
      spawnedPromises.push(this.gwl_loopWalker(weapon, output, lootGenData));
    }
    await Promise.all(spawnedPromises)

    //return output;
  }
  /**
   * A function to generate dynamic loose loot - its used in such way to speedup caluclation of multiple instances of generation at the same time
   * @param {*} lootSpawn spawn data saved on disk
   * @param {*} output response to client
   */
  async gll_loopWalker(lootSpawn, output) {
    const spawnTable = this.dynamicAvailableSpawns;
    if(spawnTable.length == 0)
    {
      await logger.error(`SpawnTable '${generateSimpleName}' in map ${output.Name} is empty please add more variations, skipping...`);
      return;
    }
    const generateSimpleName = await this.ID_Simplifier(lootSpawn.worldId);
    let generatedBsgLootSpawnStruct = await this.BSG_ConvertDataToDynamicLoot(lootSpawn);
    //upsie something goes wrong and i cant find the loot to load, skip that bitch
    if(typeof spawnTable[generateSimpleName] == "undefined")
    {
      await logger.error(`SpawnTable not found for ${generateSimpleName} with WorldId: ${lootSpawn.worldId}, skipping...`);
      console.log(`SNIPPET CODE FOR QUICK ADDING INTO THE availableSpawns.json for map ${output.Name}\n"${generateSimpleName}": [],`)
      return;
    }
    const ItemSpawnTable = spawnTable[generateSimpleName]; // SpawnTable of items that can be spawned
    const chooseRandomIndex = getRandomInt(0, ItemSpawnTable.length - 1); // generate random location of spawned item from table above

    // make sure something is not fucked here so if length is > or < then 0 just skip that part...
    // lootspawn shouldnt have that anyway...
    if (generatedBsgLootSpawnStruct.Items.length == 0) {
      const template = await Item.get(ItemSpawnTable[chooseRandomIndex]);
      const roll = getRandomInt(0, 50);
      if (template._props.LootExperience >= roll) {
        // maybe add here a loop to go back a few times to spawn items like 2-3 times at same space if not populated...
        return;
      }
      const item = await template.createAsNewItem();
      generatedBsgLootSpawnStruct.Root = item._id;
      generatedBsgLootSpawnStruct.Items.push(item);
      output.Loot.push(generatedBsgLootSpawnStruct);
    }
  }
/**
 * Generate loose loot on the map
 * @param {*} output response to client
 */
  async generateLooseLoot(output) {
    const looseLoot = this.lootSpawns.dynamic;

    let spawnedPromises = [];
    for(let lootSpawn of looseLoot) {
      spawnedPromises.push(this.gll_loopWalker(lootSpawn, output));
    }
    await Promise.all(spawnedPromises)
  }
}

module.exports.Location = Location;