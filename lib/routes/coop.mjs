import { logger, stringify } from "../utilities/_index.mjs"
import { CoopController } from "../controllers/_index.mjs";


export default async function coopRoutes(app, _opts) {

    app.all('/coop/server/create', async (request, reply) => {
        logger.info(`[/coop/server/create] ${request.body}`);
    });

    app.all('/coop/server/exist', async (request, reply) => {
        logger.info(`[/coop/server/exist] ${request.body}`);
    })

    app.all('/coop/server/read', async (request, reply) => {
        logger.info(`[/coop/server/read] ${request.body}`);
    });

    app.all('/coop/server/read/players', async (request, reply) => {
        logger.info(`[/coop/server/read/players] ${request.body}`);
    });

    app.all('/coop/server/read/lastActions', async (request, reply) => {
        logger.info(`[/coop/server/read/lastActions] ${request.body}`);
    });

    app.all('/coop/server/read/lastMoves', async (request, reply) => {
        logger.info(`[/coop/server/read/lastMoves] ${request.body}`);
    });

    app.all('/coop/server/update', async (request, reply) => {
        logger.info(`[/coop/server/update] ${request.body}`);
    });

    app.all('/coop/server/delete', async (request, reply) => {
        logger.info(`[/coop/server/delete] ${request.body}`);
    });

    app.all('/coop/get-invites', async (request, reply) => {
        logger.info(`[/coop/get-invites] ${request.body}`);
    });
    
    app.all('/coop/server-status', async (request, reply) => {
        logger.info(`[/coop/server-status] ${request.body}`);
    })
}