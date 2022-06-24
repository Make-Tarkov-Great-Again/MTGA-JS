const { baseModel } = require("./base");

class Account extends baseModel {
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

module.exports.account = Account;