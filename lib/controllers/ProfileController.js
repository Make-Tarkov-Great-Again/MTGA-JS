const { Profile } = require('../models/Profile');
const { Account } = require('../models/Account');
const { Customization } = require('../models/Customization');
const { getCurrentTimestamp, logger, FastifyResponse, readParsed, generateMongoID } = require("../../utilities");


class ProfileController {
    static async profileList(request = null, reply = null) {
        const { database: { bot: { playerScav } } } = require("../../app");
        const output = [];

        // Implement with offline raiding //
        playerScav.RegistrationDate = await getCurrentTimestamp();
        playerScav.aid = await FastifyResponse.getSessionID(request); // AIDs need to be the same

        const playerAccount = await Account.get(playerScav.aid);
        if (!playerAccount.wipe) {
            const profile = await playerAccount.getProfile();
            if (profile.character.length !== 0) {
                const character = await profile.getPmc();
                const pmc = await character.dissolve();
                pmc.savage = playerScav._id; //set pmc.savage var to scav id

                output.push(pmc, playerScav);
            }
        }
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(output)
        );
    }

    static async profileSelect(request = null, reply = null) {
        const sessionID = await FastifyResponse.getSessionID(request);
        const output = {
            "status": "ok",
            "notifier": FastifyResponse.getNotifier(sessionID),
            "notifierServer": ""
        };
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(output)
        );
    }

    static async profileCreate(request = null, reply = null) {
        const sessionID = await FastifyResponse.getSessionID(request);
        const playerAccount = await Account.get(sessionID);
        if (!playerAccount) {
            logger.logDebug("[clientGameProfileCreate] Invalid player account.");
            return;
        }

        const voice = await Customization.get(request.body.voiceId);

        const chosenSide = request.body.side.toLowerCase();
        const chosenSideCapital = chosenSide.charAt(0).toUpperCase() + chosenSide.slice(1);

        const profile = new Profile(playerAccount.id);
        const character = await playerAccount.edition.getCharacterTemplateBySide(chosenSide);
        const newID = await generateMongoID();
        character._id = "pmc" + newID;
        character.aid = playerAccount.id;
        character.savage = "scav" + newID;
        character.Info.Side = chosenSideCapital;
        character.Info.Nickname = request.body.nickname;
        character.Info.LowerNickname = request.body.nickname.toLowerCase();
        character.Info.Voice = voice._name;
        character.Info.RegistrationDate = await getCurrentTimestamp();
        character.Health.UpdateTime = await getCurrentTimestamp();

        character.Customization.Head = await Customization.get(request.body.headId);

        profile.character = character;

        profile.storage = {
            _id: character._id,
            suites: playerAccount.edition.storage[chosenSide],
            builds: {}
        };
        playerAccount.wipe = false;

        profile.dialogues = {};

        await Promise.all([
            profile.save(),
            playerAccount.save()
        ]);

        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody({ uid: "pmc" + sessionID })
        );
    }

    static async profileVoiceChange(request = null, reply = null) {
        const playerProfile = await Profile.get(await FastifyResponse.getSessionID(request));
        playerProfile.character.Info.Voice = request.body.voice;
        await playerProfile.save();
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody({
                status: 0,
                nicknamechangedate: ~~(await getCurrentTimestamp())
            })
        );
    }

    static async profileNicknameReserved(_request = null, reply = null) {
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody("")
        );
    }

    static async profileNicknameValidate(request = null, reply = null) {
        const validate = await Profile.ifAvailableNickname(request.body.nickname);

        switch (validate) {
            case "tooshort":
                return FastifyResponse.zlibJsonReply(
                    reply,
                    FastifyResponse.applyBody(null, 256, "256 -")
                );
            case "taken":
                return FastifyResponse.zlibJsonReply(
                    reply,
                    FastifyResponse.applyBody(null, 255, "255 - ")
                );
            default:
                return FastifyResponse.zlibJsonReply(
                    reply,
                    FastifyResponse.applyBody({ status: "ok" })
                );
        }
    }

    static async profileNicknameChange(request = null, reply = null) {
        const playerProfile = await Profile.get(await FastifyResponse.getSessionID(request));
        const validate = await Profile.ifAvailableNickname(request.body.nickname);

        switch (validate) {
            case "tooshort":
                return FastifyResponse.zlibJsonReply(reply, FastifyResponse.applyBody(null, 256, "256 -"));
            case "taken":
                return FastifyResponse.zlibJsonReply(reply, FastifyResponse.applyBody(null, 255, "255 - "));
            default:
                playerProfile.character.Info.Nickname = request.body.nickname;
                playerProfile.character.Info.LowerNickname = request.body.nickname.toLowerCase();
                await playerProfile.saveCharacter();
                return FastifyResponse.zlibJsonReply( reply, FastifyResponse.applyBody({status: 0,nicknamechangedate: await getCurrentTimestamp()}));
        }
    }

    static async playerEat(moveAction = null, _reply = null, playerProfile = null) {
        const output = {
            items: {
                new: [],
                change: [],
                del: []
            }
        };
        if (playerProfile) {
            const foodItem = await playerProfile.character.getInventoryItemByID(moveAction.item);
            if (!foodItem) {
                logger.logError(`[playerEat] Couldn't find item with id ${moveAction.item}`);
                return output;
            }
            if (foodItem.upd && foodItem.upd.FoodDrink && foodItem.upd.FoodDrink.HpPercent) {
                foodItem.upd.FoodDrink.HpPercent -= moveAction.count;
            }
            if (!foodItem.upd.FoodDrink.HpPercent || foodItem.upd.FoodDrink.HpPercent <= 0) {
                const itemTaken = await playerProfile.character.removeItem(foodItem._id);
                output.items.del.push(...itemTaken.removed);
                output.items.change.push(...itemTaken.changed);
            } else {
                output.items.change.push(foodItem);
            }
        }
        return output;
    }

    static async playerHealItem(moveAction = null, _reply = null, playerProfile = null) {
        const output = {
            items: {
                new: [],
                change: [],
                del: []
            }
        };
        if (playerProfile) {
            const medItem = await playerProfile.character.getInventoryItemByID(moveAction.item);
            if (!medItem) {
                logger.logError(`[playerHealItem] Couldn't find item with id ${moveAction.item}`);
                return output;
            }
            if (medItem.upd && medItem.upd.MedKit) {
                medItem.upd.MedKit.HpResource -= moveAction.count;
            } else {
                medItem.MedKit = 0;
            }
            if (medItem.upd && medItem.upd.MedKit.HpResource <= 0) {
                const itemTaken = await playerProfile.character.removeItem(medItem._id);
                output.items.del.push(...itemTaken.removed);
                output.items.change.push(...itemTaken.changed);
            } else {
                output.items.change.push(medItem);
            }
            await playerProfile.character.addHealthToBodyPart(moveAction.part, moveAction.count);
        }
        return output;
    }

    static async playerHealTrader(moveAction = null, _reply = null, playerProfile = null) {
        const output = {
            items: {
                new: [],
                change: [],
                del: []
            }
        };
        if (playerProfile) {
            if (moveAction.items.length > 0) {
                const itemTaken = await playerProfile.character.removeItem(moveAction.items[0].id, moveAction.items[0].count);
                if (!itemTaken) {
                    logger.logError(`[playerHealTrader] Couldn't take money with id ${moveAction.items[0].id}`);
                    return output;
                }
                output.items.change = itemTaken.changed;
                output.items.del = itemTaken.removed;
            }

            for (const bodyPart in moveAction.difference.BodyParts) {
                await playerProfile.character.addHealthToBodyPart(bodyPart, moveAction.difference.BodyParts[bodyPart].Health);
            }
        }
        return output;
    }
}

module.exports.ProfileController = ProfileController;
