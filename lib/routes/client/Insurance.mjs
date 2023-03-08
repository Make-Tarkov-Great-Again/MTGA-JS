import { InsuranceController } from "../../controllers/_index.mjs";

export default async function insuranceRoutes(app, _opts) {

    app.post(`/client/insurance/items/list/cost`, async (request, reply) => {
        await InsuranceController.insuranceCost(request, reply);
    })
}