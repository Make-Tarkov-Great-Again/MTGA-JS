const { Profile } = require('../models/Profile');
const { Account } = require('../models/Account');
const { Customization } = require('../models/Customization');
const { getCurrentTimestamp, logger, Response, readParsed, generateMongoID, stringify, round } = require("../../utilities");


class ProfileController {

    static async profileActions(moveAction, reply, playerProfile) {
        switch (moveAction.Action) {
            case "RestoreHealth":
                return this.playerHealTrader(moveAction, reply, playerProfile);
            case "Heal":
                return this.playerHealItem(moveAction, reply, playerProfile);
            case "Eat":
                return this.playerEat(moveAction, reply, playerProfile);
            case "ReadEncyclopedia":
                return this.readEncyclopedia(moveAction, playerProfile);
            case "AddToWishList":
                return this.addToWishList(moveAction, playerProfile);
            case "RemoveFromWishList":
                return this.removeFromWishList(moveAction, playerProfile);
            case "ResetWishList":
                return this.resetWishList(moveAction, playerProfile);
            case "CustomizationBuy":
                return this.customizationBuy(moveAction, playerProfile);
            case "CustomizationWear":
                return this.customizationWear(moveAction, playerProfile);
            case "ApplyInventoryChanges":
                return this.applyInventoryChanges(moveAction, playerProfile);
        }
    }

    static async profileList(request, reply) {
        const { database: { bot: { playerScav } } } = require("../../app");
        const output = [];

        // Implement with offline raiding //
        playerScav.RegistrationDate = await getCurrentTimestamp();
        playerScav.aid = await Response.getSessionID(request); // AIDs need to be the same

        const playerAccount = await Account.get(playerScav.aid);
        if (!playerAccount.wipe) {
            const { character } = await playerAccount.getProfile();
            if (character?.length !== 0) {
                const pmc = await character.dissolve();
                pmc.savage = playerScav._id; //set pmc.savage var to scav id

                output.push(pmc, playerScav);
            }
        }
        return Response.zlibJsonReply(
            reply,
            Response.applyBody(output)
        );
    }

    static async profileSelect(request, reply) {
        return Response.zlibJsonReply(
            reply,
            Response.applyBody({
                "status": "ok",
                "notifier": Response.getNotifier(await Response.getSessionID(request)),
                "notifierServer": ""
            })
        );
    }

    static async profileCreate(request, reply) {
        const sessionID = await Response.getSessionID(request);
        const playerAccount = await Account.get(sessionID);
        if (!playerAccount) {
            logger.debug("[clientGameProfileCreate] Invalid player account.");
            return;
        }
        playerAccount.wipe = false;

        const { _name } = await Customization.get(request.body.voiceId); // get voice name

        const chosenSide = request.body.side.toLowerCase();
        const chosenSideCapital = chosenSide.charAt(0).toUpperCase() + chosenSide.slice(1);

        const profile = new Profile(playerAccount.id);
        const character = await playerAccount.edition.getCharacterTemplateBySide(chosenSide);

        const newID = await generateMongoID();
        const currentTime = await getCurrentTimestamp()

        character._id = "pmc" + newID;
        character.aid = playerAccount.id;
        character.savage = "scav" + newID;
        character.Info.Side = chosenSideCapital;
        character.Info.Nickname = request.body.nickname;
        character.Info.LowerNickname = request.body.nickname.toLowerCase();
        character.Info.Voice = _name;
        character.Info.RegistrationDate = currentTime;
        character.Health.UpdateTime = currentTime;

        character.Customization.Head = await Customization.get(request.body.headId);

        profile.character = character;

        profile.storage = {
            _id: character._id,
            suites: playerAccount.edition.storage[chosenSide],
            builds: {},
            insurance: [],
            mailbox: []
        };
        profile.special = {};
        profile.dialogues = {};

        await Promise.all([
            profile.save(),
            playerAccount.save()
        ]);

        return Response.zlibJsonReply(
            reply,
            Response.applyBody({ uid: "pmc" + sessionID })
        );
    }

    static async profileVoiceChange(request, reply) {
        const { character } = await Profile.get(await Response.getSessionID(request));
        character.Info.Voice = request.body.voice;
        await playerProfile.save();
        return Response.zlibJsonReply(
            reply,
            Response.applyBody({
                status: 0,
                nicknamechangedate: await round((await getCurrentTimestamp()))
            })
        );
    }

    static async profileNicknameReserved(_request = null, reply = null) {
        return Response.zlibJsonReply(
            reply,
            Response.applyBody("")
        );
    }

    static async profileNicknameValidate(request = null, reply = null) {
        const validate = await Profile.ifAvailableNickname(request.body.nickname);

        switch (validate) {
            case "tooshort":
                return Response.zlibJsonReply(
                    reply,
                    Response.applyBody(null, 256, "The nickname is too short")
                );
            case "taken":
                return Response.zlibJsonReply(
                    reply,
                    Response.applyBody(null, 255, "The nickname is already in use")
                );
            case "ok":
                return Response.zlibJsonReply(
                    reply,
                    Response.applyBody({ "status": "ok" })
                );
        }
    }

    static async profileNicknameChange(request = null, reply = null) {
        const playerProfile = await Profile.get(await Response.getSessionID(request));
        const validate = await Profile.ifAvailableNickname(request.body.nickname);

        switch (validate) {
            case "tooshort":
                return Response.zlibJsonReply(reply, Response.applyBody(null, 256, "256 -"));
            case "taken":
                return Response.zlibJsonReply(reply, Response.applyBody(null, 255, "255 - "));
            default:
                playerProfile.character.Info.Nickname = request.body.nickname;
                playerProfile.character.Info.LowerNickname = request.body.nickname.toLowerCase();
                await playerProfile.saveCharacter();
                return Response.zlibJsonReply(reply, Response.applyBody({ status: 0, nicknamechangedate: await getCurrentTimestamp() }));
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
                logger.error(`[playerEat] Couldn't find item with id ${moveAction.item}`);
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
                logger.error(`[playerHealItem] Couldn't find item with id ${moveAction.item}`);
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
                    logger.error(`[playerHealTrader] Couldn't take money with id ${moveAction.items[0].id}`);
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

    static async readEncyclopedia(moveAction, playerProfile) {
        if (playerProfile) {
            for (const id of moveAction.ids) {
                playerProfile.character.Encyclopedia[id] = true;
            }
        }
        await playerProfile.saveCharacter()

    }

    static async addToWishList(moveAction, playerProfile) {
        if (playerProfile.character) {
            logger.info(`[AddToWishList] ${moveAction.templateId}`)
            if (!playerProfile.character.WishList.includes(moveAction.templateId)) {
                playerProfile.character.WishList.push(moveAction.templateId);
            }
        }
        await playerProfile.save()

    }

    static async removeFromWishList(moveAction, playerProfile) {
        if (playerProfile.character) {
            logger.info(`[RemoveFromWishList] ${moveAction.templateId}`)
            playerProfile.character.WishList = playerProfile.character.WishList.filter(
                wish => wish !== moveAction.templateId
            );
        }
        await playerProfile.saveCharacter()
    }

    static async resetWishList(moveAction, playerProfile) {
        if (playerProfile.character) {
            logger.info(`[ResetWishList] ${moveAction}`);
            playerProfile.character.WishList = [];
        }
        await playerProfile.saveCharacter()
    }

    static async customizationBuy(moveAction, playerProfile) {
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
                    logger.error(`[customizationBuy] Couldn't take money with id ${moveAction.items[0].id}`);
                    return output;
                }
                output.items.change = itemTaken.changed;
                output.items.removed = itemTaken.removed;
            }
            const customizationSuit = await Customization.getCustomizationByTraderOfferId(moveAction.offer);
            await playerProfile.addCustomization(customizationSuit._id);
        }
        return output;
    }

    static async customizationWear(moveAction, playerProfile) {
        const output = {
            items: {
                new: [],
                change: [],
                del: []
            }
        };
        // not sure if anything is  needed in output, working so far
        if (playerProfile) {
            for (const suit of moveAction.suites) {
                const customizationSuit = await Customization.get(suit);
                await playerProfile.character.wearSuit(customizationSuit);
            }
        }
        return output;
    }

    // ApplyInventoryChanges

    static async applyInventoryChanges(moveAction, playerProfile) {

        // Changed Items //
        for (const inventoryChange of moveAction.changedItems) {
            let item = await playerProfile.character.getInventoryItemByID(inventoryChange._id);
            if (item) {
                Object.assign(item, inventoryChange);
            } else {
                logger.error(`[applyInventoryChanges] Couldn't find item with id ${inventoryChange._id}`);
            }
        }
    }
}

module.exports.ProfileController = ProfileController;
