const _ = require("lodash");

const {
    DataTypes,
    DEFAULT_GENERIC_ERROR_SPEECH_TEXT,
    DEFAULT_ERROR_REPROMPT
} = require("../common.js");

const {
    validate_action_intent_state,
    update_melvin_state
} = require("../utils/navigation_utils.js");

const {
    build_melvin_voice_response, build_text_speech_and_reprompt_response 
} = require("../utils/response_builder_utils.js");

const { build_gene_expression_response } = require("../gene_expression/response_builder.js");
const { add_to_APL_text_pager } = require("../utils/APL_utils.js");


const NavigateExpressionIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "NavigateExpressionIntent";
    },
    async handle(handlerInput) {
        let speech_text = "";
        let reprompt_text = "";
        try {
            const state_change = await update_melvin_state(handlerInput);
            const melvin_state = validate_action_intent_state(handlerInput, state_change, DataTypes.GENE_EXPRESSION);
            let response = await build_gene_expression_response(handlerInput, melvin_state);
            const preferences = await handlerInput.attributesManager.getPersistentAttributes(true, {});
            const brief_mode_preference = _.has(preferences, "BRIEF_MODE") ? preferences["BRIEF_MODE"] : false;
            const opts = { "BRIEF_MODE": brief_mode_preference };
            response = build_text_speech_and_reprompt_response(response, opts);
            speech_text = response["speech_text"];
            reprompt_text = response["reprompt_text"];
            console.info(`[NavigateExpressionIntentHandler] response: ${JSON.stringify(response)}`);
        } catch (error) {
            speech_text = build_melvin_voice_response(_.get(error, "speech", DEFAULT_GENERIC_ERROR_SPEECH_TEXT));
            reprompt_text = build_melvin_voice_response(DEFAULT_ERROR_REPROMPT);
            add_to_APL_text_pager(handlerInput, "");
            console.error(`[NavigateExpressionIntentHandler] error: ${error.message}`, error);
        }

        return handlerInput.responseBuilder
            .speak(speech_text)
            .reprompt(reprompt_text)
            .withShouldEndSession(false)
            .getResponse();
    }
};

module.exports = { NavigateExpressionIntentHandler };