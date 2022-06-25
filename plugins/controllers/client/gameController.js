const { database } = require("../../../app");
const { Profile, Language, Account } = require("../../models");
const { getCurrentTimestamp, logger, FastifyResponse, writeFile } = require("../../utilities");


class GameController {
    // JET Basics //
    static modeOfflinePatches = async (_request = null, reply = null) => {
        return FastifyResponse.zlibJsonReply(reply, database.core.serverConfig.Patches);
    }

    static modeOfflinePatchNodes = async (_request = null, reply = null) => {
        return FastifyResponse.zlibJsonReply(reply, database.core.serverConfig.PatchNodes)
    }
    // Game //

    static clientGameStart = async (request = null, reply = null) => {
        let playerProfile = Profile.get(await FastifyResponse.getSessionID(request));
        if (playerProfile) {
            return FastifyResponse.zlibJsonReply
                (
                    reply,
                    FastifyResponse.applyBody
                        (
                            { utc_time: Date.now() / 1000 },
                            0,
                            null
                        )
                )
        } else {
            return FastifyResponse.zlibJsonReply
                (
                    reply,
                    FastifyResponse.applyBody
                        (
                            { utc_time: Date.now() / 1000 },
                            999,
                            "Profile Not Found!!"
                        )
                )
        }
    }

    static clientGameVersionValidate = async (request = null, reply = null) => {
        logger.logInfo("Client connected with version: " + request.body.version.major);
        await FastifyResponse.zlibJsonReply
            (
                reply,
                FastifyResponse.applyBody(null)
            );
    };

    static clientGameConfig = async (request = null, reply = null) => {
        const sessionID = await FastifyResponse.getSessionID(request);
        const responseObject = {
            queued: false,
            banTime: 0,
            hash: "BAN0",
            lang: "en",
            ndaFree: false,
            reportAvailable: true,
            languages: await Language.getAllWithoutKeys(),
            aid: sessionID,
            token: sessionID,
            taxonomy: 6,
            activeProfileId: "pmc" + sessionID,
            nickname: "user",
            backend: {
                Trading: FastifyResponse.getBackendURL(),
                Messaging: FastifyResponse.getBackendURL(),
                Main: FastifyResponse.getBackendURL(),
                RagFair: FastifyResponse.getBackendURL()
            },
            totalInGame: 0,
            utc_time: getCurrentTimestamp()
        };

        await FastifyResponse.zlibJsonReply
            (
                reply,
                FastifyResponse.applyBody(responseObject)
            );
    };

    static clientGameKeepAlive = async (request = null, _reply = null) => {
        const sessionID = await FastifyResponse.getSessionID(request);
        if (typeof sessionID == "undefined") return FastifyResponse.applyBody({
            msg: "No Session",
            utc_time: getCurrentTimestamp(),
        });
        return FastifyResponse.applyBody({ msg: "OK", utc_time: getCurrentTimestamp() });
    }

    static clientProfileList = async (request = null, reply = null) => {
        const playerAccount = await Account.get(await FastifyResponse.getSessionID(request));
        const profile = await playerAccount.getProfile();

        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(profile.character)
        )
    }

    static clientGameProfileNicknameReserved = async (_request = null, reply = null) => {
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody("")
        )
    }

    static clientGameProfileNicknameValidate = async (request = null, reply = null) => {
        const validate = await Account.ifAvailableNickname(request.body.nickname);
        const response = database.core.serverConfig.translations

        if (validate === true) {
            return FastifyResponse.zlibJsonReply(
                reply,
                FastifyResponse.applyBody({ status: "OK" })
            )
        } else {
            return FastifyResponse.zlibJsonReply(
                reply,
                FastifyResponse.applyBody(null, 255, response.alreadyInUse)
            )
        }
    }

    static clientGameProfileCreate = async (request = null, reply = null) => {
        const playerAccount = await Account.get(await FastifyResponse.getSessionID(request));
        const chosenSide = request.body.side.toLowerCase();
        const chosenSideCapital = chosenSide.charAt(0).toUpperCase() + chosenSide.slice(1);

        let profile = await playerAccount.getProfile();
        let character = profile.character;
        let profileTemplate = database.editions[chosenSide]

        character._id = "pmc" + playerAccount._id;
        character.aid = playerAccount._id;
        character.savage = "scav" + playerAccount._id;
        character.Info.Side = chosenSideCapital;
        character.Info.Nickname = request.body.nickname;
        character.Info.LowerNickname = profileTemplate.Info.Nickname.toLowerCase();
        character.Info.Voice = customization_f.getCustomization()[info.voiceId]._name;
        character.Customization = profileTemplate.Customization
        character.Customization.Head = request.body.headId;
        character.Info.RegistrationDate = ~~(new Date() / 1000);
        character.Health.UpdateTime = ~~(Date.now() / 1000);

        profile.storage = {
            err: 0, 
            errmsg: null, 
            data: 
            {
                _id: profile._id,
                suites: profileTemplate.storage
            }
        };

        writeFile(`./user/profiles/${profile._id}/character.json`, character);
        writeFile(`./user/profiles/${profile._id}/storage.json`, profile.storage);
        writeFile(`./user/profiles/${profile._id}/userbuilds.json`, profile.userbuilds);
        writeFile(`./user/profiles/${profile._id}/dialogue.json`, profile.dialogue);

        playerAccount.wipe = false;
    }
}
module.exports.GameController = GameController;