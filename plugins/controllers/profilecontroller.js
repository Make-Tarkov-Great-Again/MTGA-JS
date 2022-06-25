/**
 * This is an example controller with a basic callset.
 */
const { logger, FastifyResponse } = require("../utilities");
const { Account, ClientCustomization } = require("../models");
const { editions } = require("../../engine/database");


 class ProfileController {
    /**
     * List all entries.
     * @param {*} request 
     * @param {*} reply 
     */
    static index = async (request = null, reply = null) => {
    
    }

    /**
     * Show a specific entry.
     * @param {*} id 
     * @param {*} request 
     * @param {*} reply 
     */
    static show = async (id, request = null, reply = null) => {
        

    }

    /**
     *  Show the creation form for your data.
     * @param {*} request 
     * @param {*} reply 
     */
    static create = async (request = null, reply = null) => {
        // Grab the sessionID from the request
        const sessionID = await FastifyResponse.getSessionID(request);

        // Grab the account by the sessionID, from the database
        const account = await Account.get(sessionID);

    }

    /**
     * Process the data from your creation form.
     * @param {*} request 
     * @param {*} reply 
     */
    static store = async (request, reply = null) => {
        
    }

    /**
     * Remove an entry.
     * @param {*} id 
     * @param {*} request 
     * @param {*} reply 
     */
    static remove = async (id, request = null, reply = null) => {
        
    }

    /**
     * Show the edit form.
     * @param {*} id 
     * @param {*} request 
     * @param {*} reply 
     */
    static edit = async (id, request = null, reply = null) => {
        
    }

    /**
     * Process the updated data from your edit form.
     * @param {*} request 
     * @param {*} reply 
     */
    static update = async (request = null, reply = null) => {
        
    }

    /**
     * Delete the entry.
     * @param {*} id 
     * @param {*} request 
     * @param {*} reply 
     */
    static delete = async (id, request = null, reply = null) => {
        
    }
}

module.exports.ProfileController = ProfileController;