//const { InsuranceController } = require("../../lib/controllers")

const { logger, FastifyResponse} = require("../../utilities")

module.exports = async function insuranceRoutes(app, _opts) {

    app.post(`/client/insurance/items/list/cost`, async (request, reply) => {
        logger.logConsole(`[INSURNACE COST NOT IMPLEMENTEDDDDDD] ` + request.body)
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody({}));
    })
}