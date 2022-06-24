const BaseModel = require('./BaseModel');
const Profile = require('./Profile');
const Account = require('./Account');
const Trader = require('./Trader');
const Item = require('./Item');
const Locale = require('./Locale');
const ClientCustomization = require('./ClientCustomization');
const Language = require('./Language');

module.exports = {
    ...BaseModel,
    ...Profile,
    ...Account,
    ...Trader,
    ...Item,
    ...Locale,
    ...ClientCustomization,
    ...Language
}