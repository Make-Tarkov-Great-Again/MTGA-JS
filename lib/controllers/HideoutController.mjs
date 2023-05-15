import { logger } from "../utilities/_index.mjs";
import { Hideout, Response } from '../classes/_index.mjs';

const actionHandlers = {
    "HideoutUpgrade": Hideout.upgradeArea,
    "HideoutUpgradeComplete": Hideout.completeUpgrade,
    "HideoutImproveArea": Hideout.improveArea,
    "HideoutPutItemsInAreaSlots": Hideout.addItemToAreaSlot,
    "HideoutTakeItemsFromAreaSlots": Hideout.takeItemFromAreaSlot,
    "HideoutSingleProductionStart": Hideout.singleProductionStart,
    "HideoutToggleArea": Hideout.toggleArea,
    "HideoutTakeProduction": Hideout.takeProduction,
    "HideoutContinuousProductionStart": Hideout.continuousProductionStart,
    "HideoutScavCaseProductionStart": Hideout.scavcaseProductionStart,
    "RecordShootingRangePoints": Hideout.recordShootingRangeScore
};

export class HideoutController {

    static hideoutActions(moveAction, character, characterChanges) {
        const hideoutHandler = actionHandlers[moveAction.Action].bind(Hideout);
        if (!hideoutHandler) {
            logger.error(`[HideoutController.hideoutActions] No hideoutHandler for action ${moveAction.Action}`);
            return false;
        }
        logger.warn(`[HideoutController] ${moveAction.Action}`);
        hideoutHandler(character, moveAction, characterChanges);
    }

    static async clientHideoutWorkout(request, reply) {
        logger.info(`nah son nah`);
        return Response.zlibJsonReply(
            reply,
            Response.applyEmpty("empty")
        );
    }

    static clientHideoutQTEList(reply) {
        const qte = Hideout.getHideoutQTEList();
        return Response.zlibJsonReply(
            reply,
            { err: 0, data: qte }
        );
    }

    static clientHideoutSettings(reply) {
        const hideoutSettings = Hideout.getHideoutSettings();
        return Response.zlibJsonReply(
            reply,
            { err: 0, data: hideoutSettings }
        );
    }

    static clientHideoutAreas(reply) {
        const hideoutAreas = Hideout.getAllHideoutAreas();
        return Response.zlibJsonReply(
            reply,
            { err: 0, data: hideoutAreas }
        );
    }

    static clientHideoutProductionRecipes(reply) {
        const hideoutProductions = Hideout.getAllHideoutProductions();
        return Response.zlibJsonReply(
            reply,
            { err: 0, data: hideoutProductions }
        );
    }

    static clientHideoutProductionScavcaseRecipes(reply) {
        const scavcaseRecipes = Hideout.getAllScavcaseRecipes();
        return Response.zlibJsonReply(
            reply,
            { err: 0, data: scavcaseRecipes }
        );
    }
}
