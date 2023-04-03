import { Account } from '../classes/Account.mjs';
import { Locale } from '../classes/Locale.mjs';
import { zlibJsonReply, applyBody, getSessionID } from "../utilities/_index.mjs";


export class MenuController {
    static async clientMenuLocale(request, reply) {
        const account = Account.getWithSessionId(await getSessionID(request));
        if (!account)
            return zlibJsonReply(
                reply,
                await applyBody("ERROR", 999, "ERROR SHIT")
            );

        if (account.lang !== request.params['language']) {
            account.lang = request.params['language'];
            await Account.save(account.id);
        }
        const { menu } = Locale.get(account.lang);
        return zlibJsonReply(
            reply,
            await applyBody(menu)
        );
    };
}
