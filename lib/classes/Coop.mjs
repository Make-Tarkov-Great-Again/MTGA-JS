
class Coop {
    constructor(info) {
        this.CreatedDateTime = new Date();
        this.State = "";
        this.Ip = "";
        this.Port = "";
        this.ExpectedNumberOfPlayers = 1;
        this.Characters = [];
        this.LastData = {};
    }
}

export default new Coop();