
/*
Made by TheMaoci for MTGA

this scripts cakes old type of containers/dynamic/quest/weapons data structure 
and changes it to newer more compressed one
files are not overriden and are named as originalname2
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

/*
var FolderStructure = {
  MapName: {
    bossWaves: "filesContainingBossWaves",
    lootSpawns: "filesContainingLootSpawns",
    waves: "filesContainingWaves"
  }
}
*/

for(let mapName of MapNames)
{
  if(mapName.includes(".")) continue;
  log(`Working on: ${mapName}`);
  
  let containers = parse(read(`${WORKING_DIR}/${mapName}/lootspawns/containers.json`))
  let dynamics = parse(read(`${WORKING_DIR}/${mapName}/lootspawns/dynamic.json`))
  let quests = parse(read(`${WORKING_DIR}/${mapName}/lootspawns/quest.json`))
  let weapons = parse(read(`${WORKING_DIR}/${mapName}/lootspawns/weapons.json`))
  
  // we are skipping IsStatic cause it will be always static for containers and false for dynamics
  
  // --- STATIC - CONTAINERS ---
  // --- STATIC - CONTAINERS ---
  // --- STATIC - CONTAINERS ---
  // --- STATIC - CONTAINERS ---
  let newContainers = [];
  for(let container of containers)
  {
    let newData = {
      worldId: container.id,
      containerTpl: container.Items[0]._tpl
    }
    newContainers.push(newData);
  }
  fs.writeFileSync(`${WORKING_DIR}/${mapName}/lootspawns/containers2.json`, stringify(newContainers));
  
  // --- DYNAMIC - LOOSELOOT ---
  // --- DYNAMIC - LOOSELOOT---
  // --- DYNAMIC - LOOSELOOT ---
  // --- DYNAMIC - LOOSELOOT ---
  let newDynamic = [];
  for(let dynamic of dynamics)
  {
    //console.log(dynamic.Position);
    let newData = {
      worldId: dynamic.id,
      Position: [dynamic.Position.x, dynamic.Position.y, dynamic.Position.z]
    }
    if(typeof dynamic.randomRotation != "undefined"){
      if(dynamic.randomRotation != false){
        newData.randomRotation = true;
      }
    }
    if(typeof newData.randomRotation == "undefined"){
      if(typeof dynamic.Rotation != "undefined"){
        if(dynamic.Rotation != "0"){
          newData.Rotation = [dynamic.Rotation.x, dynamic.Rotation.y, dynamic.Rotation.z];
        }
      }
    }
    if(typeof dynamic.IsGroupPosition != "undefined"){
      if(dynamic.IsGroupPosition != false){
        newData.IsGroupPosition = true;
        if(typeof dynamic.GroupPositions != "undefined"){
            newData.GroupPositions = dynamic.GroupPositions;
        }
      }
    }
    if(typeof dynamic.useGravity != "undefined"){
      if(dynamic.useGravity != false){
        newData.useGravity = true;
      }
    }
    newDynamic.push(newData);
  }
  fs.writeFileSync(`${WORKING_DIR}/${mapName}/lootspawns/dynamic2.json`, stringify(newDynamic));

  // --- STATIONARY - WEAPONS ---
  // --- STATIONARY - WEAPONS ---
  // --- STATIONARY - WEAPONS ---
  // --- STATIONARY - WEAPONS ---
  let newWeapon = [];
  for(let weapon of weapons)
  {
    let newData = {
      worldId: weapon.id,
      weaponTpl: weapon.Items[0]._tpl
    }
    newWeapon.push(newData);
  }
  fs.writeFileSync(`${WORKING_DIR}/${mapName}/lootspawns/weapons2.json`, stringify(newWeapon));

  // --- QUESTS ---
  // --- QUESTS ---
  // --- QUESTS ---
  // --- QUESTS ---
  let newQuest = [];
  for(let quest of newQuest)
  {
    let newData = {
      worldId: quest.id,
      questItmTpl: quest.Items[0]
    }
    if(typeof quest.Position != "undefined"){
      if(quest.Position != "0"){
        newData.Position = [quest.Position.x, quest.Position.y, quest.Position.z];
      }
    }
    if(typeof quest.Rotation != "undefined"){
      if(quest.Rotation != "0"){
        newData.Rotation = [quest.Rotation.x, quest.Rotation.y, quest.Rotation.z];
      }
    }
    if(typeof quest.useGravity != "undefined"){
      if(quest.useGravity != false){
        newData.useGravity = true;
      }
    }
    newQuest.push(newData);
  }
  fs.writeFileSync(`${WORKING_DIR}/${mapName}/lootspawns/quests2.json`, stringify(newQuest));
}