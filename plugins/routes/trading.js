const { tradingController } = require("../controllers/client");
const { fastifyResponse } = require("../utilities");


module.exports = async function tradingRoutes(app, _opts) {

    app.post(`/client/trading/api/getTradersList`, async (request, reply) => {
        await tradingController.getAllTraders(request, reply);
    });

    app.post(`/client/trading/api/traderSettings`, async (request, reply) => {
        await tradingController.getAllTraders(request, reply);
    });

    app.post(`/client/trading/customization/storage`, async (request, reply) => {
        await tradingController.getStoragePath(request, reply);
    });
}