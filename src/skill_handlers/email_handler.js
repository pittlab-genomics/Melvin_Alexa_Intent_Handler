const Speech = require('ssml-builder');
const _ = require('lodash');

const {
    MelvinAttributes,
    MelvinExplorerErrors,
    DataTypes,
    DEFAULT_GENERIC_ERROR_SPEECH_TEXT
} = require('../common.js');

const {
    validate_action_intent_state,
    update_melvin_state
} = require('../navigation/navigation_helper.js');


const NavigateEmailIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'NavigateEmailIntent';
    },
    async handle(handlerInput) {
        let speechText = '';
        let repromptText = '';

        try {

            speechText = "Ok, I'm emailing that to you now.";
            repromptText = "Please check your inbox in a while."

        } catch (error) {
            if (error['speech']) {
                speechText = error['speech'];
            } else {
                speechText = DEFAULT_GENERIC_ERROR_SPEECH_TEXT;
            }
            console.error(`Error in NavigateEmailIntent`, error);
        }

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(repromptText)
            .getResponse();
    }
};

module.exports = {
    NavigateEmailIntentHandler
}