const BaseModel = require('./baseModel');
const Profile = require('./Profile');
const Account = require('./Account');
const Trader = require('./trader');
const Item = require('./item');
const Locale = require('./locale');
const ClientCustomization = require('./clientCustomization');
const Language = require('./language');
const Edition = require('./edition');
const Customization = require('./Customization');

module.exports = {
    ...BaseModel,
    ...Profile,
    ...Account,
    ...Trader,
    ...Item,
    ...Locale,
    ...ClientCustomization,
    ...Language,
    ...Edition,
    ...Customization
}