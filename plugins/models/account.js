const { BaseModel } = require("./BaseModel");

class Account extends BaseModel {
    constructor() {
        super();
    }

    getLanguage() {
        if(this.lang != (null || undefined || "") ){
            return this.lang;
        } else {
            this.lang = en;
            this.save()
            return this.lang;
        }
    }
}

module.exports.Account = Account;