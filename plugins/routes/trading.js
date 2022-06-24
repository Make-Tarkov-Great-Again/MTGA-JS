const { tradingController } = require("../controllers/client");
const { fastifyResponse } = require("../utilities");


module.exports = async function tradingRoutes(app, opts) {

    app.post(`/client/trading/api/getTradersList`, async (request, reply) => {
        return await tradingController.getAllTraders(request, reply);
    })

    app.post(`/client/trading/api/traderSettings`, async (request, reply) => {
        return await tradingController.getAllTraders(request, reply);
    })

    app.post(`/client/trading/customization/storage`, async (request, reply) => {
        return await tradingController.getStoragePath(request, reply);
    })
}