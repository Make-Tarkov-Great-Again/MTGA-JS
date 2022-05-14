'use strict'

const changeProfileEmail = async (request, reply) => {
    reply.send(`/launcher/profile/change/email route is working`);
}

const changeProfilePassword = async (request, reply) => {
    reply.send(`/launcher/profile/change/password route is working`);
}

const wipeProfile = async (request, reply) => {
    reply.send(`/launcher/profile/change/wipe route is working`);
}

const getProfile = async (request, reply) => {
    reply.send(`/launcher/profile/get route is working`);
}

const loginProfile = async (request, reply) => {
    reply.send(`/launcher/profile/login route is working`);
}

const registerProfile = async (request, reply) => {
    reply.send(`/launcher/profile/register route is working`);
}

const removeProfile = async (request, reply) => {
    reply.send(`/launcher/profile/remove route is working`);
}

const connectServer = async (request, reply) => {
    reply.send(`/launcher/server/connect route is working`);
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