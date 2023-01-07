const { logger } = require("../utilities");
const { BaseModel } = require("./BaseModel");
const { database: { locations } } = require("../../app");


class Location extends BaseModel {
    constructor(id) {
        super();

        this.createDatabase(id);
    }

    // converts shortened Dynamic and Forced loot templates from file format ot BSG format
    async BSG_ConvertDataToDynamicLoot(item_data){
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
    async BSG_ConvertDataToStaticLoot(item_data){
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
          Items: item_data.Items,
        };
    }

    async regenerateLocation(){
        await this.adjustLocationSettings();
        await this.generateBotSpawns();
        await this.generateLoot();
    }

    async adjustLocationSettings(){
        /**
         * Dynamic raid timers
         */
    }

    async adjustExits(){}

    async adjustWaves(){}

    async generateBotSpawns(){

        //BossLocationSpawn
        //SpawnPointParams
    }

    async generateLoot(mapName){
        const output = []
        await this.generateStaticLoot(output, mapName);
        await this.generateWeaponsLoot(output, mapName);
        await this.generateLooseLoot(output, mapName);
        return output;
    }

    async generateStaticLoot(output, mapName){
        //Loot
        //IsStatic = true
        let containers = locations[mapName].lootspawns.containers;
        let quest = locations[mapName].lootspawns.quest;

        return output;
    }
    
    async generateStaticLoot(output, mapName){
        //Loot
        //IsStatic = true
        let weapons = locations[mapName].lootspawns.weapons;

        return output;
    }

    async generateLooseLoot(output, mapName){
        let looseLoot = locations[mapName].lootspawns.dynamic;

        return output;
    }
}

module.exports.Location = Location;