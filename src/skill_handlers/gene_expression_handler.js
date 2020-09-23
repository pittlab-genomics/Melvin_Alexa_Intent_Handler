const {
    DataTypes,
    DEFAULT_GENERIC_ERROR_SPEECH_TEXT
} = require("../common.js");

const {
    validate_action_intent_state,
    update_melvin_state
} = require("../utils/navigation_utils.js");

const { build_gene_expression_response } = require("../gene_expression/response_builder.js");


const NavigateExpressionIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "NavigateExpressionIntent";
    },
    async handle(handlerInput) {
        let speechText = "";

        try {
            const state_change = await update_melvin_state(handlerInput);
            const melvin_state = validate_action_intent_state(handlerInput, state_change, DataTypes.GENE_EXPRESSION);
            const response = await build_gene_expression_response(handlerInput, melvin_state);
            speechText = response["speech_text"];

        } catch (error) {
            if (error["speech"]) {
                speechText = error["speech"];
            } else {
                speechText = DEFAULT_GENERIC_ERROR_SPEECH_TEXT;
            }
            console.error(`NavigateExpressionIntentHandler: message: ${error.message}`, error);
        }

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};

module.exports = { NavigateExpressionIntentHandler };