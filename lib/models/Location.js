const { logger } = require("../utilities");
const { BaseModel } = require("./BaseModel");

class Location extends BaseModel {
    constructor(id) {
        super();

        this.createDatabase(id);
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

    async generateLoot(){
        const output = []
        await this.generateStaticLoot(output);
        await this.generateLooseLoot(output);
        return output;
    }

    async generateStaticLoot(output){
        //Loot
        //IsStatic = true
        return output;
    }

    async generateLooseLoot(output){
        return output;
    }
}

module.exports.Location = Location;