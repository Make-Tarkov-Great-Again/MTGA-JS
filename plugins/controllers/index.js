const { AccountController } = require('../controllers/AccountController');
const { WeblauncherController } = require('../controllers/WebLauncherController');
const { ProfileController } = require('../controllers/ProfileController');


/**
 * Main Index Controller - Gotta test to see if this works. -King
 */


module.exports = {
    ...AccountController,
    ...WeblauncherController,
    ...ProfileController
}