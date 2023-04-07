import { Account, Locale, Response } from '../classes/_index.mjs';

export class MenuController {
    static async clientMenuLocale(request, reply) {
        const account = Account.getWithSessionId(Response.getSessionID(request));
        if (!account)
            return Response.zlibJsonReply(
                reply,
                Response.applyBody("ERROR", 999, "ERROR SHIT")
            );

        if (account.lang !== request.params['language']) {
            account.lang = request.params['language'];
            await Account.save(account.id);
        }
        const { menu } = Locale.get(account.lang);
        return Response.zlibJsonReply(
            reply,
            Response.applyBody(menu)
        );
    };
}
