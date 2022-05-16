const fp = require('fastify-plugin');
const { 
    readParsed, 
    fileExist, 
    stringify, 
    writeFile, 
    getAbsolutePathFrom, 
    getDirectoriesFrom,
    getFilesFrom
 } = require('./../utilities/fileIO');

/**
 * Set fileIO decorators for fastify instance.
 */
async function fileIO(app, options) {
    await app.decorate('readParsed', readParsed);
    app.log.info('Decorated readParsed');

    await app.decorate('fileExist', fileExist);
    app.log.info('Decorated fileExist');

    await app.decorate('stringify', stringify);
    app.log.info('Decorated stringify');

    await app.decorate('writeFile', writeFile);
    app.log.info('Decorated writeFile');
    
    await app.decorate('getAbsolutePathFrom', getAbsolutePathFrom);
    app.log.info('Decorated getAbsolutePathFrom');

    await app.decorate('getDirectoriesFrom', getDirectoriesFrom);
    app.log.info('Decorated getDirectoriesFrom');

    await app.decorate('getFilesFrom', getFilesFrom);
    app.log.info('Decorated getFilesFrom');
}
module.exports = fp(fileIO);