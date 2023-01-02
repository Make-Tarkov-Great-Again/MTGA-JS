const { Profile } = require('../models/Profile');
const { Account } = require('../models/Account');
const { Customization } = require('../models/Customization');
const { getCurrentTimestamp, logger, Response, generateMongoID, round } = require("../utilities");
const { tasker } = require("../../app");
const { Item } = require('../models/Item');


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

    static async profileList(sessionID, reply) {
        const output = [];

        const playerAccount = await Account.get(sessionID);
        if (!playerAccount.wipe) {
            const profile = await playerAccount.getProfile();
            const character = await profile.getPmc();
            if (character && Object.keys(character).length !== 0) {

                await character.updateCharacter();
                await profile.saveCharacter();
                
                const { database: { bot: { playerScav } } } = require("../../app");

                playerScav.RegistrationDate = await getCurrentTimestamp();
                playerScav.aid = sessionID; // AIDs need to be the same
                playerScav._id = character.savage;

                output.push(playerScav)
                output.push(character);
            } else {
                await logger.info(`Character doesn't exist, begin creation`);
            }
        }
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(output)
        );
    }

    static async profileSelect(sessionID, reply) {
        const data = await Response.getNotifier(sessionID);
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody({
                status: "ok",
                notifier: data,
                notifierServer: ""
            })
        );
    }

    static async profileCreate(request, reply) {
        const sessionID = await Response.getSessionID(request);
        const playerAccount = await Account.get(sessionID);
        if (!playerAccount) {
            await logger.debug("[clientGameProfileCreate] Invalid player account.");
            return;
        }
        playerAccount.wipe = false;

        const { _name } = await Customization.get(request.body.voiceId); // get voice name

        const chosenSide = request.body.side.toLowerCase();
        const chosenSideCapital = chosenSide.charAt(0).toUpperCase() + chosenSide.slice(1);

        const profile = new Profile(playerAccount.id);
        const character = await playerAccount.edition.getCharacterTemplateBySide(chosenSide);

        const currentTime = await getCurrentTimestamp();

        character._id = await generateMongoID();
        character.aid = playerAccount.id;
        character.savage = await generateMongoID();
        character.Info.Side = chosenSideCapital;
        await character.setCharacterNickname(request.body.nickname);
        character.Info.Voice = _name;
        character.Info.RegistrationDate = currentTime;
        character.Health.UpdateTime = currentTime;

        character.Customization.Head = request.body.headId;

        await character.updateCharacter();

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



        await tasker.addTask(profile.id + "_profile_tick", profile.tick, profile, 10000);

        return Response.zlibJsonReply(
            reply,
            await Response.applyBody({ uid: profile.character.aid })
        );
    }

    static async profileVoiceChange(request, reply) {
        const { character } = await Profile.get(await Response.getSessionID(request));
        character.Info.Voice = request.body.voice;
        await character.save();
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody({
                status: 0,
                nicknamechangedate: await round((await getCurrentTimestamp()))
            })
        );
    }

    static async profileNicknameReserved(reply) {
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody("")
        );
    }

    static async profileNicknameValidate(request = null, reply = null) {
        const validate = await Profile.ifAvailableNickname(request.body.nickname);
        switch (validate) {
            case "tooshort":
                return Response.zlibJsonReply(
                    reply,
                    await Response.applyBody(null, 256, "The nickname is too short")
                );
            case "taken":
                return Response.zlibJsonReply(
                    reply,
                    await Response.applyBody(null, 255, "The nickname is already in use")
                );
            default:
                return Response.zlibJsonReply(
                    reply,
                    await Response.applyBody({ status: "ok" })
                );
        }
    }

    static async profileNicknameChange(request, reply) {
        const { character } = await Profile.get(await Response.getSessionID(request));
        const validate = await Profile.ifAvailableNickname(request.body.nickname);

        switch (validate) {
            case "tooshort":
                return Response.zlibJsonReply(reply, await Response.applyBody(null, 256, "256 -"));
            case "taken":
                return Response.zlibJsonReply(reply, await Response.applyBody(null, 255, "255 - "));
            default:
                await character.setCharacterNickname(request.body.nickname);
                await character.save();
                return Response.zlibJsonReply(reply, await Response.applyBody({ status: 0, nicknamechangedate: await getCurrentTimestamp() }));
        };
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
                await logger.error(`[playerEat] Couldn't find item with id ${moveAction.item}`);
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
                await logger.error(`[playerHealItem] Couldn't find item with id ${moveAction.item}`);
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
                    await logger.error(`[playerHealTrader] Couldn't take money with id ${moveAction.items[0].id}`);
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
            await logger.info(`[AddToWishList] ${moveAction.templateId}`)
            if (!playerProfile.character.WishList.includes(moveAction.templateId)) {
                playerProfile.character.WishList.push(moveAction.templateId);
            }
        }
        await playerProfile.save()

    }

    static async removeFromWishList(moveAction, playerProfile) {
        if (playerProfile.character) {
            await logger.info(`[RemoveFromWishList] ${moveAction.templateId}`)
            playerProfile.character.WishList = playerProfile.character.WishList.filter(
                wish => wish !== moveAction.templateId
            );
        }
        await playerProfile.saveCharacter()
    }

    static async resetWishList(moveAction, playerProfile) {
        if (playerProfile.character) {
            await logger.info(`[ResetWishList] ${moveAction}`);
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
                    await logger.error(`[customizationBuy] Couldn't take money with id ${moveAction.items[0].id}`);
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
                await logger.error(`[applyInventoryChanges] Couldn't find item with id ${inventoryChange._id}`);
            }
        }
    }


    static async processInventoryItems(inventory) {
        const output = [];

        const toProcess = [
            inventory.equipment,
            inventory.stash,
            inventory.sortingTable,
            inventory.questRaidItems,
            inventory.questStashItems
        ];

        for (const key in toProcess) {
            const parent = toProcess[key]
            const id = await generateMongoID();
            output.push(...await this.resetInventoryItemIDs(parent, inventory.items, id));
            toProcess[key] = id;
        }
        return output;

    }
    static async resetInventoryItemIDs(parent, children, newId) {
        const output = [];

        for (const child of children) {

            if (child.parentId === parent._id) {
                //check if this item has children in the array
                const grandchildren = await this.resetInventoryItemIDs(child, children, child._id);


                const item = await Item.generateItemModel(child);
                item._id = await generateMongoID();
                item.parentId = newId;

                const upd = await Item.createFreshBaseItemUpd(child._tpl)
                if (!item.upd && upd !== "error")
                    item.upd = upd;

                if (grandchildren) {
                    for (const grandchild of grandchildren) {
                        grandchild.parentId = item._id;

                        const upd = await Item.createFreshBaseItemUpd(child._tpl)
                        if (!grandchild.upd && upd !== "error")
                            grandchild.upd = upd;

                        output.push(grandchild);
                    }
                }
                output.push(item);
            }
        }
        if (output.length > 0) return output;
        else return false;
    }
}

module.exports.ProfileController = ProfileController;
