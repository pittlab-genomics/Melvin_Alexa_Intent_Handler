const _ = require("lodash");

const {
    DataTypes,
    DEFAULT_GENERIC_ERROR_SPEECH_TEXT,
    DEFAULT_ERROR_REPROMPT
} = require("../common.js");

const {
    build_gene_definition_response,
    build_gene_target_response
} = require("../gene/gene_response_builder.js");

const {
    build_melvin_voice_response, build_text_speech_and_reprompt_response 
} = require("../utils/response_builder_utils.js");
const { add_to_APL_text_pager } = require("../utils/APL_utils.js");
const {
    validate_action_intent_state, update_melvin_state
} = require("../utils/navigation_utils.js");


const NavigateGeneDefinitionIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "NavigateGeneDefinitionIntent";
    },
    async handle(handlerInput) {
        let speech_text = "";
        let reprompt_text = "";

        try {
            const state_change = await update_melvin_state(handlerInput);
            const melvin_state = validate_action_intent_state(handlerInput, state_change, DataTypes.GENE_DEFINITION);
            const params = { ...melvin_state };
            let response = await build_gene_definition_response(handlerInput, params);
            const preferences = await handlerInput.attributesManager.getPersistentAttributes(true, {});
            const brief_mode_preference = _.has(preferences, "BRIEF_MODE") ? preferences["BRIEF_MODE"] : false;
            const opts = {
                "BRIEF_MODE":         brief_mode_preference,
                "ENABLE_VOICE_STYLE": true 
            };
            response = build_text_speech_and_reprompt_response(response, opts);
            speech_text = response["speech_text"];
            reprompt_text = response["reprompt_text"];
            console.info(`[NavigateGeneDefinitionIntentHandler] response: ${JSON.stringify(response)}`);
        } catch (error) {
            speech_text = build_melvin_voice_response(_.get(error, "speech", DEFAULT_GENERIC_ERROR_SPEECH_TEXT));
            reprompt_text = build_melvin_voice_response(DEFAULT_ERROR_REPROMPT);
            add_to_APL_text_pager(handlerInput, "");
            console.error(`[NavigateGeneDefinitionIntentHandler] error: ${error.message}`, error);
        }
        return handlerInput.responseBuilder
            .speak(speech_text)
            .reprompt(reprompt_text)
            .withShouldEndSession(false)
            .getResponse();
    }
};

const NavigateGeneTargetIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "NavigateGeneTargetIntent";
    },
    async handle(handlerInput) {
        let speech_text = "";
        let reprompt_text = "";

        try {
            const state_change = await update_melvin_state(handlerInput);
            const melvin_state = validate_action_intent_state(handlerInput, state_change, DataTypes.GENE_TARGETS);
            const params = { ...melvin_state };
            let response = await build_gene_target_response(handlerInput, params);
            const preferences = await handlerInput.attributesManager.getPersistentAttributes(true, {});
            const brief_mode_preference = _.has(preferences, "BRIEF_MODE") ? preferences["BRIEF_MODE"] : false;
            const opts = {
                "BRIEF_MODE":         brief_mode_preference,
                "ENABLE_VOICE_STYLE": true 
            };
            response = build_text_speech_and_reprompt_response(response, opts);
            speech_text = response["speech_text"];
            reprompt_text = response["reprompt_text"];
            console.info(`[NavigateGeneTargetIntentHandler] response: ${JSON.stringify(response)}`);
        } catch (error) {
            speech_text = build_melvin_voice_response(_.get(error, "speech", DEFAULT_GENERIC_ERROR_SPEECH_TEXT));
            reprompt_text = build_melvin_voice_response(DEFAULT_ERROR_REPROMPT);
            add_to_APL_text_pager(handlerInput, "");
            console.error(`[NavigateGeneTargetIntentHandler] error: ${error.message}`, error);
        }

        return handlerInput.responseBuilder
            .speak(speech_text)
            .reprompt(reprompt_text)
            .withShouldEndSession(false)
            .getResponse();
    }
};

module.exports = {
    NavigateGeneDefinitionIntentHandler,
    NavigateGeneTargetIntentHandler
};