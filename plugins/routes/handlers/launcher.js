'use strict'


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

async function connectServer(request, reply){
    await reply.send(`/launcher/server/connect route is working`);
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