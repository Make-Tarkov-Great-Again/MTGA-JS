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
    app.decorate('readParsed', readParsed);
    app.decorate('fileExist', fileExist);
    app.decorate('stringify', stringify);
    app.decorate('writeFile', writeFile);
    app.decorate('getAbsolutePathFrom', getAbsolutePathFrom);
    app.decorate('getDirectoriesFrom', getDirectoriesFrom);
    app.decorate('getFilesFrom', getFilesFrom);
}
module.exports = fp(fileIO);