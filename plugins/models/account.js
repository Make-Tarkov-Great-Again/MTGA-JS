const { baseModel } = require("./base");

class account extends baseModel {
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

module.exports.account = account;