/*
Made by TheMaoci for MTGA

This scripts generates 1 file with all the loot spawns with simplified names 
and what items will be spawning on that locations based on presets in #presets folder in MTGA database
*/


"use strict";
const fs = require('fs');
const path = require('path');
const log = console.log;

const stringify = (data) => JSON.stringify(data, null, "\t");
const parse = (string) => JSON.parse(string);
const read = (file) => fs.readFileSync(file, 'utf8');

var WORKING_DIR = "../assets/database/locations";

var MapNames = fs.readdirSync(`${WORKING_DIR}`);

for(let mapName of MapNames)
{
    if(mapName.includes(".")) continue;
    let presetFileNames = fs.readdirSync(`${WORKING_DIR}/${mapName}/#presets`);
    let presetLocationDynamicSpawnNames = {};
    //let presetsData = [];
    for(let presetName of presetFileNames)
    {
        let data = parse(read(`${WORKING_DIR}/${mapName}/#presets/${presetName}`));

        if(typeof data.Location == "undefined"){

            data = data.data;
        } else {
            data = data.Location;
        }
        if(typeof data.Loot == "undefined")
        {
            log(presetName + " undefined data.[Location or data].Loot")
            continue;
        }

        let LootSpawns = data.Loot;
        for(let loot in LootSpawns)
        {
            if(typeof LootSpawns[loot].IsStatic != undefined)
            {
                if(LootSpawns[loot].IsStatic == false)
                {
                    let name = LootSpawns[loot].Id;
                    name = name.replace(/[\(\)\[\]0-9- ]{1,99}/g ,"");
                    name = name.replace("__", "");
                    if(name.includes("quest")){

                        continue;
                    }
                    if(typeof presetLocationDynamicSpawnNames[name] != "undefined"){
                        presetLocationDynamicSpawnNames[name].OrgId.push(LootSpawns[loot].Id)
                    } else {
                        log(name);
                        presetLocationDynamicSpawnNames[name] = { OrgId: [LootSpawns[loot].Id] }
                    }
                }
            }
        }
        //presetsData.push(data);

    }
    fs.writeFileSync("./dynamicLootAll.json", stringify(presetLocationDynamicSpawnNames));
}