
/*
Made by TheMaoci for MTGA

Removes duplicated loot spots from dynamic table across all maps

*/

"use strict";
const fs = require('fs');
const path = require('path');
const log = console.log;

const stringify = (data) => JSON.stringify(data, null, "\t");
const parse = (string) => JSON.parse(string);
const read = (file) => fs.readFileSync(file, 'utf8');

var PRECISION = 12; // 4 places after ,

var WORKING_DIR = "../assets/database/locations";

var MathRound = (number, precision) => {
    const Precision = typeof precision == "undefined" ? PRECISION : precision;
    return parseFloat(number).toFixed(Precision);
}

var MapNames = fs.readdirSync(`${WORKING_DIR}`);

for(let mapName of MapNames)
{
    if(mapName.includes(".")) continue;

    let positionTables = [];
    let data_dynamic = parse(read(`${WORKING_DIR}/${mapName}/lootSpawns/dynamic_backup.json`));
    let new_dynamic = [];
    for(let dynamic of data_dynamic)
    {
        if(typeof dynamic.Position != "undefined")
        {
            if(dynamic.Position.length == 3){
                const mappedPosition = `x${MathRound(dynamic.Position[0])}y${MathRound(dynamic.Position[1])}z${MathRound(dynamic.Position[2])}`;
                const short_name_org = dynamic.worldId.replace(/[\(\)\[\]0-9- ]{1,99}/g ,"").replace("__", "");
                if(!positionTables.includes(mappedPosition)){
                    positionTables.push(mappedPosition);
                    new_dynamic.push(dynamic);
                } else {
                    for(let dyn of new_dynamic)
                    {
                        if(mappedPosition == `x${MathRound(dyn.Position[0])}y${MathRound(dyn.Position[1])}z${MathRound(dyn.Position[2])}`){
                            const short_name_new = dyn.worldId.replace(/[\(\)\[\]0-9- ]{1,99}/g ,"").replace("__", "");
                            if(short_name_new == short_name_org) continue;
                            if( typeof dyn.worldIds == "undefined"){
                                dyn["worldIds"] = [];
                            }
                            dyn.worldIds.push(dynamic.worldId);
                        }
                    }
                }
            }
        }
    }
    console.log(`MAP: ${mapName} || OLD: ${data_dynamic.length}, NEW:${new_dynamic.length}`);
    //fs.writeFileSync(`${WORKING_DIR}/${mapName}/lootSpawns/dynamic_backup.json`, stringify(data_dynamic));
    fs.writeFileSync(`${WORKING_DIR}/${mapName}/lootSpawns/dynamic3.json`, stringify(new_dynamic));
}