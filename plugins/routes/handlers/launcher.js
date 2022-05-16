'use strict'
const fastJson = require('fast-json-stringify');


async function changeProfileEmail (request, reply) {
    await reply.send(`/launcher/profile/change/email route is working`);
}

async function changeProfilePassword(request, reply){
    await reply.send(`/launcher/profile/change/password route is working`);
}

async function wipeProfile(request, reply){
    await reply.send(`/launcher/profile/change/wipe route is working`);
}

async function getProfile(request, reply){
    await reply.send(`/launcher/profile/get route is working`);
}

async function loginProfile(request, reply){
    await reply.send(`/launcher/profile/login route is working`);
}

async function registerProfile(request, reply){
    await reply.send(`/launcher/profile/register route is working`);
}

async function removeProfile(request, reply){
    await reply.send(`/launcher/profile/remove route is working`);
}

/**
 * Connects to the server
 * @param {*} request 
 * @param {*} reply 
 */
async function connectServer(request, reply){
    const connectSchema = fastJson({
        backendURL: 'string',
        name: 'string',
        editions: 'string'
    });

    await reply.send(
        connectSchema({
            backendURL: "https://" + AE.serverConfig.ip + ":" + AE.serverConfig.port,
            name: AE.serverConfig.name,
            editions: Object.keys(AE.database.profiles)
        })
    )
    .type('application/json');
}


module.exports = {
    changeProfileEmail, 
    changeProfilePassword, 
    wipeProfile, 
    getProfile, 
    loginProfile, 
    registerProfile, 
    removeProfile,
    connectServer
}