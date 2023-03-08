import { Character } from "../classes/Character.mjs";

export class NoteController {
    static async noteActions(moveAction, character, characterChanges) {
        switch (moveAction.Action) {
            case "AddNote":
                return Character.addNote(character, moveAction);
            case "EditNote":
                return Character.editNote(character, moveAction);
            case "DeleteNote":
                return Character.removeNote(character, moveAction);
        }
    }
}
