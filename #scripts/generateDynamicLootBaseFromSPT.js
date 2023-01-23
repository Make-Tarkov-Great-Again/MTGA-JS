
/*
Made by TheMaoci for MTGA

Generates our loot structs from SPT type of files
requires database of SPT in SPT_assets folder
will generate output into generated-from-spt

*/

"use strict";
const fs = require('fs');
const path = require('path');
const log = console.log;

const stringify = (data) => JSON.stringify(data, null, "\t");
const parse = (string) => JSON.parse(string);
const read = (file) => fs.readFileSync(file, 'utf8');

var WORKING_DIR = "SPT_assets/locations";

var MapNames = fs.readdirSync(`${WORKING_DIR}`);

var TotalDynamicLootSpawns = {};
//var TotalForcedLootSpawns = {};
for(let mapName of MapNames)
{
    if(mapName.includes(".")) continue;
    const lootFile = `${WORKING_DIR}/${mapName}/looseLoot.json`;
    if(!fs.existsSync(lootFile)) continue;

    let MapDynamicLootSpawns = [];
    let MapForcedLootSpawns = [];
    let MapSpawnerItemsTable = {};
    const data = parse(read(lootFile));

    const forcedSpawns = data.spawnpointsForced;
    for(let spawn of forcedSpawns)
    {
        const template = spawn.template;
        MapForcedLootSpawns.push({
            "worldId": template.Id,
            "questItmTpl": template.Items[0]._tpl,
            "Position": [
                template.Position.x,
                template.Position.y,
                template.Position.z
            ],
            "Rotation": [
                template.Rotation.x,
                template.Rotation.y,
                template.Rotation.z
            ]
        })
    }

    const spawns = data.spawnpoints;
    for(let spawn of spawns)
    {
        const template = spawn.template;
        let lootToPush = {
            "worldId": template.Id,
            "Position": [
                template.Position.x,
                template.Position.y,
                template.Position.z
            ]
        }
        if(template.useGravity == true)
        {
            lootToPush["useGravity"] = true;
        }
        if(template.randomRotation == true)
        {
            lootToPush["randomRotation"] = true;
        } else {
            lootToPush["Rotation"] = [template.Rotation.x,template.Rotation.y,template.Rotation.z];
        }
        MapDynamicLootSpawns.push(lootToPush);


        let name = template.Id
        name = name.replace(/[\(\)\[\]0-9- ]{1,99}/g ,"");
        name = name.replace("__", "");

        // map data
        if(typeof MapSpawnerItemsTable[name] != "undefined"){
            for(let dist of spawn.itemDistribution)
            {
                if(!MapSpawnerItemsTable[name].includes(dist.tpl))
                    MapSpawnerItemsTable[name].push(dist.tpl);
            }
        } else {
            MapSpawnerItemsTable[name] = [];
            for(let dist of spawn.itemDistribution)
            {
                    MapSpawnerItemsTable[name].push(dist.tpl);
            }
        }
        // global data
        if(typeof TotalDynamicLootSpawns[name] != "undefined"){
            for(let dist of spawn.itemDistribution)
            {
                if(!TotalDynamicLootSpawns[name].includes(dist.tpl))
                TotalDynamicLootSpawns[name].push(dist.tpl);
            }
        } else {
            TotalDynamicLootSpawns[name] = [];
            for(let dist of spawn.itemDistribution)
            {
                TotalDynamicLootSpawns[name].push(dist.tpl);
            }
        }
        
    }
    fs.mkdirSync(path.join(__dirname, 'generated-from-spt', mapName));

    fs.writeFileSync(`./generated-from-spt/${mapName}/dynamics.json`, stringify(MapDynamicLootSpawns));
    fs.writeFileSync(`./generated-from-spt/${mapName}/quests.json`, stringify(MapForcedLootSpawns));
    fs.writeFileSync(`./generated-from-spt/${mapName}/availableSpawns.json`, stringify(MapSpawnerItemsTable));

}
fs.writeFileSync(`./generated/TotalAvailableSpawns.json`, stringify(TotalDynamicLootSpawns));
