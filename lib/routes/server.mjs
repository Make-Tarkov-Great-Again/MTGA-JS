import { Response } from "../utilities/response.mjs";
import { database } from "../../app.mjs";

export default async function serverRoutes(app, _opts) {

    app.get(`/server/config/server`, async (_request, reply) => {
        const { serverConfig } = database.core;
        return Response.zlibJsonReply(reply, serverConfig);
    });

}