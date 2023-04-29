import { logger, createZipArchive, zipEntry } from '../lib/utilities/_index.mjs'


const ASSETS = zipEntry('./assets',  'assets');
const LIB = zipEntry('./lib',  'lib');
const EXE = zipEntry('./deploy/dist/MTGA-Server.exe',  'MTGA-Server.exe');
const NAME = 'MTGA-Server.zip'
const DEST = './deploy/dist'


createZipArchive(DEST, NAME, [ASSETS, LIB, EXE])
    .then(function () {
        logger.info('Archive completed and created: ' + DEST + '/' +  NAME);
    })
    .catch(function (err) {
        logger.error(err);
    });

