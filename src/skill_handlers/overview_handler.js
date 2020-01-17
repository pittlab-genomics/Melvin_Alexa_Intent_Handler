const {
    DataTypes,
    DEFAULT_GENERIC_ERROR_SPEECH_TEXT
} = require('../common.js');

const { build_overview_clinvar_response } = require('../overview/clinvar_response_builder.js');

const {
    validate_action_intent_state,
    update_melvin_state
} = require('./navigation_helper.js');

const { add_to_APL_image_pager } = require('../utils/APL_utils.js');

const NavigateOverviewIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'NavigateOverviewIntent';
    },
    async handle(handlerInput) {
        let speechText = '';
        try {
            const state_change = await update_melvin_state(handlerInput);
            const melvin_state = validate_action_intent_state(handlerInput, state_change, DataTypes.OVERVIEW);
            const overview_response = await build_overview_clinvar_response(melvin_state);
            add_to_APL_image_pager(handlerInput, overview_response['image_list']);
            speechText = overview_response['speech_text'];

        } catch (error) {
            if (error['speech']) {
                speechText = error['speech'];
            } else {
                speechText = DEFAULT_GENERIC_ERROR_SPEECH_TEXT;
            }
            console.error(`Error in NavigateOverviewIntentHandler`, error);
        }

        console.log("SPEECH TEXT = " + speechText);
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
}

module.exports = {
    NavigateOverviewIntentHandler
}