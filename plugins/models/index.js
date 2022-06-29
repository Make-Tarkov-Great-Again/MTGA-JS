const BaseModel  = require('./BaseModel');
const Character = require('./Character');
const Account = require('./Account');
const Trader = require('./Trader');
const Item = require('./Item');
const Locale = require('./Locale');
const Language = require('./Language');
const Edition = require('./Edition');
const Customization = require('./Customization');
const Profile = require('./Profile');
const Dialogue = require('./Dialogue');
const Quest = require('./Quest');
const Weaponbuild = require('./Weaponbuild');
const HideoutArea = require('./HideoutArea');
const HideoutProduction = require('./HideoutProduction');
const HideoutScavcase = require('./HideoutScavcase');
const HideoutSetting = require('./HideoutSetting');
const Location = require('./Location');

module.exports = {
    ...Account,
    ...Trader,
    ...Item,
    ...Locale,
    ...Language,
    ...Edition,
    ...Customization,
    ...Profile,
    ...Character,
    ...Dialogue,
    ...Quest,
    ...Weaponbuild,
    ...BaseModel,
    ...HideoutArea,
    ...HideoutProduction,
    ...HideoutScavcase,
    ...HideoutSetting,
    ...Location,
}