const { logger, generateMongoID, wipeDepend } = require("../utilities");
const { BaseModel } = require("./BaseModel");
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
    // if you want you can remove Root ID it will be recreated from first object of Items array
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
      Root: Root, // id of container
      Items: item_data.Items,
    };
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

  async prepareExits(output) 
  {
    //output.exits = this.exits;
    //return output;
  }

  async prepareBotWaves(output) 
  {
    output.waves = this.waves;
    //return output;
  }
  async prepareBossWaves(output) 
  {
    output.BossLocationSpawn = this.bossWaves;
    //return output;
  }

  async prepareSpawnPoints(output) 
  {
    //SpawnPointParams generated
    //output.SpawnPointParams = this.spawnPoints;
    //return output;
  }

  static async generateLocationData(mapName) {
    let output = {}
    const location = await Location.get(mapName);

    output = await location.generateBase(output);
    
    await Promise.all([
      // location data generation
      location.prepareSpawnPoints(output),
      location.prepareExits(output),
      location.prepareBotWaves(output),
      location.prepareBossWaves(output),
      // loot generation
      location.generateStaticLoot(output),
      location.generateQuestLoot(output),
      location.generateWeaponsLoot(output),
      location.generateLooseLoot(output)
    ]);
    
    return output;
  }

  async generateBase(output) {
    output = wipeDepend(this.base);
    return output;
  }
  async generateContainerContents(data) {
    //const lootGenData = await Location.get("lootGen");
    //lootGenData.containers
    // TODO: generate data, place items in free space, choose what items to get...
    //return data;
  }
  async generateStaticLoot(output) {
    let containers = this.lootSpawns.containers;
    for (const container of containers) {
      const newId = await generateMongoID();
      let data = await this.BSG_DefaultLootStructure();
      data.IsStatic = true;
      data.useGravity = true;
      data.Id = container.worldId;
      data.Items.push({ _id: newId, _tpl: container.containerTpl });
      data.Root = newId;
      // generate specific container loot here !!!
      data = await this.generateContainerContents(data);
      output.Loot.push(data);
    }
    //return output;
  }
  async generateQuestLoot(output) {
    let quests = this.lootSpawns.quests;
    for (const quest of quests) {
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
    }
    //return output;
  }
  async generateWeaponsLoot(output) {
    //stationary generation of the weapon !!!
    const lootGenData = await Location.get("lootGen");
    let weapons = this.lootSpawns.weapons;
    for (const weapon of weapons) {
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
        continue;
      }
      // generating ID's
      const newId = await generateMongoID();
      const magazineId = await generateMongoID();
      // get static BAS structure of loot
      let data = await this.BSG_DefaultLootStructure();

      // data.randomRotation= false;
      // data.Position= { x: 0, y: 0, z: 0 };
      // data.Rotation= { x: 0, y: 0, z: 0 };
      // data.IsGroupPosition= false;
      // data.GroupPositions= [];

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

    //return output;
  }
  async generateLooseLoot(output) {
    //let looseLoot = this.lootSpawns.dynamic;
    // TODO: choosing of item depending on loot "worldId" name, and maybe other features also
    //return output;
  }
}

module.exports.Location = Location;