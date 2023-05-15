import { logger } from "../utilities/_index.mjs";

import * as fs from 'fs';

import archiver from 'archiver'

/**
 * Generate a zip file entry with a path and an archive name
 * @param {*} resourcePath
 * @param {*} resourceName
 * @returns
 */
const zipEntry = (resourcePath, resourceName) => {
    return {path: resourcePath, name: resourceName};
}

/**
 * Create a zip archive with archiver
 * https://github.com/archiverjs/node-archiver
 * @param {*} zipFileDir
 * @param {*} zipFileName
 * @param {*} zipEntries
 * @returns
 */
const createZipArchive = (zipFileDir, zipFileName, zipEntries) => {

    if (!fs.existsSync(zipFileDir)){
        fs.mkdirSync(zipFileDir);
    }
    const zipFilePath = zipFileDir  + '/' + zipFileName;

        // create a file to stream archive data to.
        const output = fs.createWriteStream(zipFilePath);
        const archive = archiver('zip', {
            zlib: { level: 9 } // Sets the compression level.
        });

        // listen for all archive data to be written
        // 'close' event is fired only when a file descriptor is involved
        output.on('close', function () {
            logger.trace(archive.pointer() + ' total bytes');
            logger.trace('archiver has been finalized and the output file descriptor has closed.');
        });

        // This event is fired when the data source is drained no matter what was the data source.
        // It is not part of this library but rather from the NodeJS Stream API.
        // @see: https://nodejs.org/api/stream.html#stream_event_end
        output.on('end', function () {
            logger.trace('Data has been drained');
        });

        // good practice to catch warnings (ie stat failures and other non-blocking errors)
        archive.on('warning', function (err) {
            if (err.code === 'ENOENT') {
                // log warning
            } else {
                // throw error
                throw err;
            }
        });

        // good practice to catch this error explicitly
        archive.on('error', function (err) {
            throw err;
        });

        // pipe archive data to the file
        archive.pipe(output);



        zipEntries.forEach(element => {

            if (element) {

                if ( element.path && element.name) {
                    logger.debug('adding zip entry ' + element.path + " => " + element.name)

                    if (fs.lstatSync(element.path).isDirectory() ) {

                        // append files from a sub-directory and naming it `new-subdir` within the archive
                         archive.directory(element.path, element.name);
                    } else {

                        archive.file(element.path, {name: element.name});
                    }


                } else {
                    logger.warn('invalid zip resource ' + element.toString());
                }

            } else {
                logger.warn('empty zip resource');

            }

        });





        // finalize the archive (ie we are done appending files but streams have to finish yet)
        // 'close', 'end' or 'finish' may be fired right after calling this method so register to them beforehand
        logger.debug('finalize ' + zipFilePath + '...');
       return archive.finalize();
}



export {
    createZipArchive,
    zipEntry
};
