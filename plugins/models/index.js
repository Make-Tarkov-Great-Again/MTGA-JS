const BaseModel = require('./baseModel');
const Profile = require('./profile');
const Account = require('./account');
const Trader = require('./trader');
const Item = require('./item');
const Locale = require('./locale');
const ClientCustomization = require('./clientCustomization');
const Language = require('./language');
const Edition = require('./edition');

module.exports = {
    ...BaseModel,
    ...Profile,
    ...Account,
    ...Trader,
    ...Item,
    ...Locale,
    ...ClientCustomization,
    ...Language,
    ...Edition
}