const {
    DataTypes,
    DEFAULT_GENERIC_ERROR_SPEECH_TEXT
} = require('../common.js');

const {
    validate_action_intent_state,
    update_melvin_state
} = require('../navigation/navigation_helper.js');

const { build_gene_expression_response } = require('../gene_expression/response_builder.js');


const NavigateExpressionsIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'NavigateExpressionsIntent';
    },
    async handle(handlerInput) {
        let speechText = '';

        try {
            const state_change = await update_melvin_state(handlerInput);
            const melvin_state = validate_action_intent_state(handlerInput, state_change, DataTypes.EXPRESSIONS);
            const response = await build_gene_expression_response(handlerInput, melvin_state);
            speechText = response['speech_text'];

        } catch (error) {
            if (error['speech']) {
                speechText = error['speech'];
            } else {
                speechText = DEFAULT_GENERIC_ERROR_SPEECH_TEXT;
            }
            console.error(`NavigateExpressionsIntentHandler: message: ${error.message}`, error);
        }

        console.log("SPEECH TEXT = " + speechText);
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};

module.exports = {
    NavigateExpressionsIntentHandler
}