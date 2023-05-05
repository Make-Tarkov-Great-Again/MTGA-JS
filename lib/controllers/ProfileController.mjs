

import { database } from "../../app.mjs";

import {
    Account, Profile, Customization, Response,
    Edition, Character, Inventory, Item
} from '../classes/_index.mjs';

import { getCurrentTimestamp, logger } from "../utilities/_index.mjs";

export class ProfileController {

    static async profileActions(moveAction, profile, characterChanges) {
        switch (moveAction.Action) {
            case "RestoreHealth":
                return this.playerHealTrader(moveAction, profile.character, characterChanges);
            case "Heal":
                return this.playerHealItem(moveAction, profile.character, characterChanges);
            case "Eat":
                return this.playerEat(moveAction, profile.character, characterChanges);
            case "ReadEncyclopedia":
                return this.readEncyclopedia(moveAction, profile.character);
            case "AddToWishList":
                return this.addToWishList(moveAction, profile.character);
            case "RemoveFromWishList":
                return this.removeFromWishList(moveAction, profile.character);
            case "ResetWishList":
                return this.resetWishList(moveAction, profile.character);
            case "CustomizationWear":
                return this.customizationWear(moveAction, profile.character);
            case "ApplyInventoryChanges":
                return this.applyInventoryChanges(moveAction, profile.character);
        }
    }


    static profileStatus(request, reply) {
        const { savage, _id } = Character.get(Response.getSessionID(request));

        const output = {
            maxPveCountExceeded: false,
            profiles: [
                {
                    profileid: savage,
                    profileToken: null,
                    status: "Free",
                    sid: "",
                    ip: "",
                    port: 0
                },
                {
                    profileid: _id,
                    profileToken: null,
                    status: "Free",
                    sid: "",
                    ip: "",
                    port: 0
                }
            ]
        };

        return Response.zlibJsonReply(
            reply,
            Response.applyBody(output)
        );
    }


    static profileList(sessionID, reply) {
        const character = Character.get(sessionID);

        if (character && Object.keys(character).length !== 0) {
            return Response.zlibJsonReply(
                reply,
                Response.applyBody([
                    {
                        ...database.bot.playerScav,
                        RegistrationDate: getCurrentTimestamp(),
                        aid: sessionID,
                        _id: character.savage
                    },
                    character
                ])
            )
        }

        logger.info(`Character doesn't exist, begin creation`);
        return Response.zlibJsonReply(
            reply,
            Response.applyBody([])
        );
    }

    static profileSelect(sessionID, reply) {
        const data = Response.getNotifier(sessionID);
        return Response.zlibJsonReply(
            reply,
            Response.applyBody({
                status: "ok",
                notifier: data,
                notifierServer: ""
            })
        );
    }

    static async profileCreate(request, reply) {
        const sessionID = Response.getSessionID(request);
        const playerAccount = Account.getWithSessionId(sessionID);
        if (!playerAccount) {
            logger.warn("[clientGameProfileCreate] Invalid player account.");
            return;
        }
        playerAccount.wipe = false;

        // get voice name
        const sideLowerCase = request.body.side.toLowerCase();

        const character = await Character.create(
            Edition.getCopyCharacterTemplateWithSide(
                playerAccount.edition,
                sideLowerCase),
            request);

        const storage = Edition.getCopyStorageSuitsWithSide(playerAccount.edition, sideLowerCase);

        await Profile.create(playerAccount, character, storage);
        await Profile.save(sessionID);

        // TO ADAPT, but not prioritary
        //await tasker.addTask(profile.id + "_profile_tick", profile.tick, profile, 10000);

        return Response.zlibJsonReply(
            reply,
            Response.applyBody({ uid: character.aid })
        );
    }

    static async profileVoiceChange(request, reply) {
        const sessionID = Response.getSessionID(request);
        Character.setCharacterVoice(sessionID, request.body.voice);
        await Character.save(sessionID);

        return Response.zlibJsonReply(
            reply,
            Response.applyBody({
                status: 0,
                nicknamechangedate: Math.round((getCurrentTimestamp()))
            })
        );
    }

    static profileNicknameReserved(reply) {
        return Response.zlibJsonReply(
            reply,
            Response.applyBody("")
        );
    }

    static profileNicknameValidate(request = null, reply = null) {
        const available = Profile.isAvailableNickname(request.body.nickname);
        switch (available) {
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
            default:
                return Response.zlibJsonReply(
                    reply,
                    Response.applyBody({ status: "ok" })
                );
        }
    }

    static async profileNicknameChange(request, reply) {
        const available = Profile.isAvailableNickname(request.body.nickname);
        switch (available) {
            case "tooshort":
                return Response.zlibJsonReply(reply, Response.applyBody(null, 256, "256 -"));
            case "taken":
                return Response.zlibJsonReply(reply, Response.applyBody(null, 255, "255 - "));
            case "ok":
                const sessionID = Response.getSessionID(request);
                Character.setCharacterNickname(sessionID, request.body.nickname);
                await Character.save(sessionID);

                return Response.zlibJsonReply(
                    reply,
                    Response.applyBody({ status: 0, nicknamechangedate: getCurrentTimestamp() })
                );
        };
    }

    static playerEat(moveAction, character, characterChanges) {
        const foodItem = Inventory.getInventoryItemByID(character.Inventory, moveAction.item);
        if (!foodItem)
            return logger.error(`[playerEat] Couldn't find item with id ${moveAction.item}`);

        if (foodItem.upd && foodItem.upd.FoodDrink && foodItem.upd.FoodDrink.HpPercent) {
            foodItem.upd.FoodDrink.HpPercent -= moveAction.count;
        }
        if (!foodItem.upd.FoodDrink.HpPercent || foodItem.upd.FoodDrink.HpPercent <= 0) {
            Inventory.removeItem(character.Inventory, characterChanges, foodItem._id);
        } else {
            characterChanges.items.change.push(foodItem);
        }

    }

    static playerHealItem(moveAction, character, characterChanges) {
        const medItem = Inventory.getInventoryItemByID(character.Inventory, moveAction.item);
        if (!medItem) {
            logger.error(`[playerHealItem] Couldn't find item with id ${moveAction.item}`);
            return;
        }

        if (medItem.upd && medItem.upd.MedKit)
            medItem.upd.MedKit.HpResource -= moveAction.count;
        else
            medItem.MedKit = 0;

        if (medItem.upd && medItem.upd.MedKit.HpResource <= 0)
            Inventory.removeItem(character.Inventory, characterChanges, medItem._id);
        else
            characterChanges.items.change.push(medItem);

        Character.addHealthToBodyPart(character, moveAction.part, moveAction.count);
    }

    static playerHealTrader(moveAction, character, characterChanges) {
        if (moveAction.items.length > 0) {
            const item = moveAction.items[0];
            if (!Inventory.removeItem(character, characterChanges, item.id, item.count)) {
                logger.error(`[playerHealTrader] Couldn't take money with id ${item.id}`);
                return;
            }
        }

        for (const bodyPart in moveAction.difference.BodyParts)
            Character.addHealthToBodyPart(character, bodyPart, moveAction.difference.BodyParts[bodyPart].Health);

    }

    static readEncyclopedia(moveAction, character) {
        for (const entry of moveAction.ids)
            Character.setEncyclopediaEntry(character, entry);
    }

    static customizationWear(moveAction, character) {
        for (const suit of moveAction.suites) {
            const customizationSuit = Customization.getWithId(suit);
            Character.wearSuit(character, customizationSuit);
        }
    }

    static addToWishList(moveAction, character) {
        Character.addToWishList(character, moveAction.templateId);
    }

    static removeFromWishList(moveAction, character) {
        Character.filterWishList(character, moveAction.templateId);

    }

    static async resetWishList(character) {
        Character.resetWishList(character);
    }

    // ApplyInventoryChanges

    static applyInventoryChanges(moveAction, character) {
        for (const inventoryChange of moveAction.changedItems) {
            const item = Inventory.getInventoryItemByID(character.Inventory, inventoryChange._id);
            if (!item) {
                logger.error(`[applyInventoryChanges] Couldn't find item with id ${inventoryChange._id}`);
                return;
            }
            Inventory.removeInventoryItemByID(character.Inventory, inventoryChange._id);

            if (inventoryChange.location) {
                inventoryChange.location.r = (inventoryChange.location.r == "Vertical") ? 1 : 0;
                item.location = inventoryChange.location;
                item.slotId = inventoryChange.slotId;
            }

            if (Item.checkIfTplIsMoney(item._tpl) && !item.upd.StackObjectsCount) {
                item.upd.StackObjectsCount = 1;
            }

            character.Inventory.items.push(item);
        }
    }
}
