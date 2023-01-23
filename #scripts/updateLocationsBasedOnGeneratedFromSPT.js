
/*
Made by TheMaoci for MTGA

This scripts loops through generated locations dynamic/quests files in folder generated-flom-spt
checks if that entry is existing in our MTGA locations data and if not adds it in there.
this files not overrides anything you will need to manually go inside each location folder 
and review and change names from dynamic_new and quests_new to dynamic and quests and deleting original files

*/

"use strict";
const fs = require('fs');
const path = require('path');
const log = console.log;

const stringify = (data) => JSON.stringify(data, null, "\t");
const parse = (string) => JSON.parse(string);
const read = (file) => fs.readFileSync(file, 'utf8');

var WORKING_DIR = "./generated-from-spt";
var WORKING_DIR_OUT = "../assets/database/locations";

var MapNames_GEN = fs.readdirSync(`${WORKING_DIR}`);
var MapNames_ORG = fs.readdirSync(`${WORKING_DIR_OUT}`);


for(let mapName of MapNames_ORG)
{
    if(mapName.includes(".")) continue;
    if(!fs.existsSync(`${WORKING_DIR_OUT}/${mapName}/lootSpawns/dynamic.json`))
    {
        let dynCopy = parse(read(`${WORKING_DIR}/${mapName}/dynamics.json`));
        fs.writeFileSync(`${WORKING_DIR_OUT}/${mapName}/lootSpawns/dynamic.json`, stringify(dynamicLoot));
    }
    if(!fs.existsSync(`${WORKING_DIR_OUT}/${mapName}/lootSpawns/quests.json`))
    {
        let queCopy = parse(read(`${WORKING_DIR}/${mapName}/quests.json`));
        fs.writeFileSync(`${WORKING_DIR_OUT}/${mapName}/lootSpawns/quests.json`, stringify(questLoot));
    }
    let dynamicLoot = parse(read(`${WORKING_DIR_OUT}/${mapName}/lootSpawns/dynamic.json`));
    let questLoot = parse(read(`${WORKING_DIR_OUT}/${mapName}/lootSpawns/quests.json`));
    let ListOfDynamicsInList = []   
    let ListOfQuestsInList = []   
    for(let dyn of dynamicLoot)
    {
        ListOfDynamicsInList.push(dyn.worldId)
    }
    for(let quest of questLoot)
    {
        ListOfQuestsInList.push(quest.worldId)
    }

    let newDynamic = parse(read(`${WORKING_DIR}/${mapName}/dynamics.json`));
    let newQuest = parse(read(`${WORKING_DIR}/${mapName}/quests.json`));

    for(let dyn of newDynamic)
    {
        if(!ListOfDynamicsInList.includes(dyn.worldId))
            dynamicLoot.push(dyn);
    }
    for(let quest of newQuest)
    {
        if(!ListOfQuestsInList.includes(quest.worldId))
            questLoot.push(quest);
    }
   
    fs.writeFileSync(`${WORKING_DIR_OUT}/${mapName}/lootSpawns/dynamic_new.json`, stringify(dynamicLoot));
    fs.writeFileSync(`${WORKING_DIR_OUT}/${mapName}/lootSpawns/quests_new.json`, stringify(questLoot));
}