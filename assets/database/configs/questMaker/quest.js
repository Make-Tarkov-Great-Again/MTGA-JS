const questLocaleTemplate = {
    "5ac23c6186f7741247042bad": { // quest id
        "name": "Gunsmith - Part 1",
        "note": "",
        "successMessageText": "5ac242f286f774138762ee00",
        "failMessageText": "5ac242f286f774138762ee01",
        "": "5ac242f286f774138762ee02",
        "description": "5ac242f286f774138762ee03",
        "conditions": {
            "5accd5e386f77463027e9397": "Give brief description of the quest", //id for quest condition
            "5acf375f86f7741bb8377ff7": ""
        },
        "location": "any" //location id for quest
    }
}

const questLocales = {
    "5ac23c6186f7741247042bad": {
        "success5ac242f286f774138762ee00": "your success message",
        "fail5ac242f286f774138762ee01": "your fail message", //can be empty, but needs ID
        "started5ac242f286f774138762ee02": "started message", // same as above
        "description5ac242f286f774138762ee03": "In-depth description of the quest",
    }
}

const locationIds = [
    "Interchange",
    "Customs",
    "Reserve",
    "Woods",
    "Shoreline",
    "Factory_4_Day",
    "Factory_4_Night",
    "Lighthouse",
    "Laboratory",
]

const questTypes = [
    PickUp,
    Elimination,
    Discover,
    Completion,
    Exploration,
    Levelling,
    Experience,
    Standing,
    Loyalty,
    Merchant,
    Skill,
    Multi,
    WeaponAssembly
]

const PickUpTemplate = [
    {
        "_parent": "FindItem",
        "_props": {
            "dogtagLevel": 0,
            "id": "MAKE_ME_UNIQUE",
            "index": 0, //index of item in array for client to check
            "maxDurability": 100,
            "minDurability": 0,
            "parentId": "",
            "onlyFoundInRaid": true,
            "dynamicLocale": false,
            "target": [
                "ITEM_ID_TO_FIND"
            ],
            "value": "0", //amount of item to find
            "visibilityConditions": []
        },
        "dynamicLocale": false
    },
    {
        "_parent": "HandoverItem",
        "_props": {
            "dogtagLevel": 0,
            "id": "MAKE_ME_UNIQUE",
            "index": 1, //index of item in array for client to check
            "maxDurability": 100,
            "minDurability": 0,
            "parentId": "",
            "onlyFoundInRaid": true,
            "dynamicLocale": false,
            "target": [
                "ITEM_ID_TO_FIND (from above Find Me)"
            ],
            "value": "0", //amount to handover (same as the above Find Me)
            "visibilityConditions": []
        },
        "dynamicLocale": false
    }
]

