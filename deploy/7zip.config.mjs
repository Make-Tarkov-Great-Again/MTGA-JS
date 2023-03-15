import { createSfxWindows } from 'node-7z-archive';

const ASSETS = "./assets";
const LIB = "./lib"
const EXE = "./deploy/dist/MTGA-Server.exe"
const NAME = "MTGA-Server.7z"
const DEST = "./deploy/dist"

const OPTIONS = {
    m: "x9",
}

createSfxWindows(NAME, [ASSETS, LIB, EXE], DEST, OPTIONS)
    .then(function () {
        console.log('Archiving done!');
    })
    .catch(function (err) {
        console.error(err);
    });