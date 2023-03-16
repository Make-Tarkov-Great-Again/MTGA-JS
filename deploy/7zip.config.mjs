import { createSfxWindows } from 'node-7z-archive';
import { logger } from '../lib/utilities/pino.mjs'


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
        logger.info('Self-Extracting Archive completed and created!');
    })
    .catch(function (err) {
        logger.error(err);
    });

