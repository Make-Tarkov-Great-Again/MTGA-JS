'use strict'
const fastJson = require('fast-json-stringify');
const {
    app,
    account: {
        find,
        register,
        getEditions,
        remove,
        changeEmail,
        changePassword,
        reloadAccountByLogin,
        wipe
    },
    database: {
        profiles,
        core
    }
} = require(`../../../app`);
const { noBody } = require('../../utilities/response');

module.exports = async function launcherRoutes(app, opts) {
    app.post(`/`, {

        config: {
            rawBody: true,
        },

        handler(req, reply) {
            reply.send(req.rawBody);
        }
    })

    app.get('/launcher/profile/change/email', async (req, reply) => {
        let output = await changeEmail(req.rawBody);
        reply.send(output === "" ? "FAILED" : "OK");
    });

    app.get('/launcher/profile/change/password', async (req, reply) => {
        let output = await changePassword(req.rawBody);
        reply.send(output === "" ? "FAILED" : "OK");
    })

    app.post('/launcher/profile/wipe', async (req, reply) => {
        let output = await wipe(req.rawBody);
        reply.send(output === "" ? "FAILED" : "OK")
    })

    app.post('/launcher/profile/register', async (req, reply) => {
        const output = await register(req.rawBody);
        app.log.info(output);
        reply.send(output === "" ? "FAILED" : output);
    })

    app.post('/launcher/profile/remove', async (req, reply) => {
        let output = await remove(req.rawBody)
        reply.send(output === "" ? "FAILED" : "OK");
    })



    app.get('/launcher/profile/get', async (request, reply) => {
        const serverConfig = database.core.serverConfig
        const accountID = await reloadAccountByLogin(req.rawBody);
        let output = find(accountID);
        reply.compress(noBody(output["server"] = serverConfig.name));
    })

    app.get('/launcher/server/connect', async (request, reply) => {
        const data = await getEditions(profiles)
        const server = core.serverConfig;
        reply.send(
            JSON.stringify(
                {
                    backendURL: "https://" + server.ip + ":" + server.port,
                    name: server.name,
                    editions: data
                }
            )
        );
    })

    app.post('/launcher/profile/login',
        async (req, reply) => {
            reply
                .compress(noBody(reloadAccountByLogin(req.rawBody)));
        })
}