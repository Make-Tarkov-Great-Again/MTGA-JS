import { database } from "../../app.mjs";

import { Customization } from "./Customization.mjs";
//import { Inventory } from "./Inventory.mjs";
import { Trader } from "./Trader.mjs";

import {
    stringify, fileExist, generateMongoID, readParsed,
    writeFile, getFileUpdatedDate, repair, getCurrentTimestamp, logger, Response // , readParsed
} from "../utilities/_index.mjs";

export class Character {

    static async create(template, request) {
        const currentTime = getCurrentTimestamp();
        const { _name } = Customization.getWithId(request.body.voiceId);

        template._id = generateMongoID();
        template.aid = await Response.getSessionID(request);
        template.savage = generateMongoID();
        template.Info.Side = request.body.side;
        template.Info.Nickname = request.body.nickname;
        template.Info.LowerNickname = request.body.nickname.toLowerCase();
        template.Info.Voice = _name;
        template.Info.RegistrationDate = currentTime;
        template.Health.UpdateTime = currentTime;
        template.Customization.Head = request.body.headId;

        return template;
    }

    /**
     * Retrieve character object from profiles database by sessionID
     * @param {string} sessionID 
     * @returns {<Promise>object}
     */
    static get(sessionID) {
        return database.profiles[sessionID].character;
    }

    /**
    * Return the path of the character.json file for this profile
    * @param {string} sessionID 
    * @returns {Promise<String>}
    */
    static getCharacterPath(sessionID) {
        return `./user/profiles/${sessionID}/character.json`;
    }

    /**
     * Return base data structure for changement, to be sent to the client
     * @param {object} character
     * @returns {Promise<object>}
     */
    static async getChangesTemplate(character) {
        const CHARACTER_ID = character._id;
        const CHARACTER_EXPERIENCE = character.Info.Experience;
        const CHARACTER_SKILLS = character.Skills;
        const CHARACTER_HEALTH = character.Health;
        const TRADER_RELATIONS = character.TradersInfo;

        return {
            warnings: [],
            profileChanges: {
                [CHARACTER_ID]: {
                    _id: CHARACTER_ID,
                    experience: CHARACTER_EXPERIENCE,
                    quests: [],
                    questsStatus: [],
                    repeatableQuests: [],
                    ragFairOffers: [],
                    builds: [],
                    items: {
                        new: [],
                        change: [],
                        del: []
                    },
                    production: null,
                    improvements: {},
                    skills: CHARACTER_SKILLS,
                    health: CHARACTER_HEALTH,
                    traderRelations: TRADER_RELATIONS
                }
            }
        };
    }

    /**
     * Write/Save character changes to file
     * @param {string} sessionID
     */
    static async save(sessionID) {
        const characterPath = this.getCharacterPath(sessionID);
        const character = database.profiles[sessionID]?.character;

        // Check if a PMC character exists in the server memory.
        if (!character)
            return;

        const currentCharacter = stringify(character);
        if (!await fileExist(characterPath)) {
            await writeFile(characterPath, currentCharacter);
            database.fileAge[sessionID].character = await getFileUpdatedDate(characterPath);

            logger.info(`[CHARACTER SAVE] Character file for profile ${sessionID} registered and saved to disk.`);
            return;
        }

        // Check if the memory content differs from the content on disk
        const savedCharacter = stringify(await readParsed(characterPath));
        if (currentCharacter !== savedCharacter) {
            await writeFile(characterPath, currentCharacter);
            database.fileAge[sessionID].character = await getFileUpdatedDate(characterPath);

            logger.info(`[CHARACTER SAVE] Character file for profile ${sessionID} saved to disk.`);
        } else
            logger.info(`[CHARACTER SAVE] Character file for profile ${sessionID} save skipped!`);
    }

    static setCharacterNickname(sessionID, nickname) {
        database.profiles[sessionID].character.Info.Nickname = nickname;
        database.profiles[sessionID].character.Info.LowerNickname = nickname.toLowerCase();
    }

    static setCharacterVoice(sessionID, voice) {
        database.profiles[sessionID].character.Info.Voice = voice;
    }

    static async getLoyalty(character, traderID) {
        const { loyaltyLevels } = await Trader.getBase(traderID);

        const playerSaleSum = character.TradersInfo[traderID]
            ? character.TradersInfo[traderID].salesSum
            : 0;

        const playerStanding = character.TradersInfo[traderID]
            ? character.TradersInfo[traderID].standing
            : 0;

        const playerLevel = character.Info.Level;

        let calculatedLoyalty = 0;
        if (traderID !== "ragfair") {
            // we check if player meet loyalty requirements
            for (const loyaltyLevel of loyaltyLevels) {
                if (playerSaleSum >= loyaltyLevel.minSalesSum &&
                    playerStanding >= loyaltyLevel.minStanding &&
                    playerLevel >= loyaltyLevel.minLevel) {
                    calculatedLoyalty++;
                } else if (calculatedLoyalty === 0)
                    calculatedLoyalty = 1;
                else
                    break;
            }
        } else
            return "ragfair";
        return (calculatedLoyalty - 1);
    }

    static async getBackendCounters(character) {
        return character.BackendCounters;
    }

    static async getBackendCounter(character, conditionId) {
        return character.BackendCounters[conditionId];
    }

    /**
    * Update values of existing backend counters, or create and add new backend counter
    * @param {object} character
    * @param {string} conditionId 
    * @param {string} qid 
    * @param {int} counter 
    * @returns 
    */
    static async updateBackendCounters(character, conditionId, qid, counter) {
        const backend = await this.getBackendCounter(character, conditionId)
        if (backend) {
            backend.value += counter;
            return;
        }

        character.BackendCounters[conditionId] = {
            "id": conditionId,
            "qid": qid,
            "value": counter
        }
    }

    static async getQuest(character, questId) {
        return character.Quests.find(quest => quest.qid === questId);
    }

    static async updateQuest(character, id, status) {
        const quest = await this.getQuest(character, id);
        quest.status = status;
        quest.statusTimers[status] = getCurrentTimestamp();
    }


    static setEncyclopediaEntry(character, entry) {
        character.Encyclopedia[entry] = true;
    }

    static examineItem(character, itemId) {
        if (!itemId) {
            logger.error("Examine request failed: No itemId");
            return false;
        }

        character.Encyclopedia[itemId] = true;
        return true;
    }

    static getExperience(character) {
        if (!character.Info.Experience)
            character.Info.Experience = 0;
        return character.Info.Experience;
    }

    static addExperience(character, experiencePoints) {
        character.Info.Experience += experiencePoints;
        return character.Info.Experience;
    }

    static getTraderRelations(character) {
        return character.traderRelations;
    }

    static getTraderRelation(character, traderID) {
        return character.traderRelations[traderID];
    }

    static setTraderRelations(character, toBeSet) {
        Object.assign(character.traderRelations, toBeSet);
    }

    static setTraderRelation(character, traderID, toBeSet) {
        Object.assign(character.traderRelations[traderID], toBeSet);
    }

    static async getPlayerSkill(character, skillId) {
        const playerSkill = character.Skills.Common.find(iteration => iteration.Id === skillId);
        return playerSkill ?? false;
    }

    static async getPlayerSkillLevel(character, skillId) {
        const playerSkill = await this.getPlayerSkill(character, skillId);
        let level = 0;

        if (playerSkill.Progress < 550) {
            level = floor(1 / 2 * (-1 + Math.sqrt(0.8 * playerSkill.Progress + 1)));
        } else {
            level = 10 + floor((playerSkill.Progress - 550) / 100);
            if (level > 51) {
                level = 51;
            }
        }

        return level;
    }

    static async getMasterSkill(character, skillId) {
        return character.Skills.Mastering.find(iteration => iteration.Id === skillId);
    }

    static async isPlayerSkillLevelElite(character, skillId) {
        return this.getPlayerSkillLevel(character, skillId) == 51;
    }

    static async wearSuit(character, customization) {
        if (customization._parent === "5cd944d01388ce000a659df9") {
            character.Customization.Feet = await Customization.getWithId(customization._props.Feet);
        } else if (customization._parent === "5cd944ca1388ce03a44dc2a4") {
            character.Customization.Body = await Customization.getWithId(customization._props.Body);
            character.Customization.Hands = await Customization.getWithId(customization._props.Hands);
        }
    }

    static addToWishList(character, wishToAdd) {
        if (!character.WishList.includes(wishToAdd)) {
            logger.info(`${wishToAdd} added to Wish List`);
            character.WishList.push(wishToAdd);
        }
        logger.info(`${wishToAdd} already in Wish List`);

    }

    static resetWishList(character) {
        character.WishList = [];
        logger.info(`Wish List reset`);
    }

    static async filterWishList(character, wishToRemove) {
        character.WishList = character.WishList.filter(wish => wish !== wishToRemove);
        logger.info(`${wishToRemove} removed from Wish List`);
    }

    static async addHealthToBodyPart(character, bodyPart, health) {
        character.Health.BodyParts[bodyPart].Health.Current = round(character.Health.BodyParts[bodyPart].Health.Current + health);
        if (character.Health.BodyParts[bodyPart].Health.Current > character.Health.BodyParts[bodyPart].Health.Maximum) {
            character.Health.BodyParts[bodyPart].Health.Current = character.Health.BodyParts[bodyPart].Health.Maximum;
        }
        character.Health.UpdateTime = getCurrentTimestamp();
    }

    static addNote(character, contents) {
        const note = {
            "Time": contents.note.Time,
            "Text": contents.note.Text
        }
        character.Notes.Notes.push(note);
    }

    static editNote(character, contents) {
        character.Notes.Notes[contents.index] = {
            "Time": contents.note.Time,
            "Text": contents.note.Text
        }
    }

    static removeNote(character, contents) {
        delete character.Notes.Notes[contents.index];
    }
}