const {
    DataTypes,
    DEFAULT_GENERIC_ERROR_SPEECH_TEXT,
} = require("../common.js");

const {
    build_gene_definition_response,
    build_gene_target_response
} = require("../gene/gene_response_builder.js");

const {
    validate_action_intent_state, update_melvin_state 
} = require("../utils/navigation_utils.js");


const NavigateGeneDefinitionIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "NavigateGeneDefinitionIntent";
    },
    async handle(handlerInput) {
        let speechText = "";

        try {
            const state_change = await update_melvin_state(handlerInput);
            const melvin_state = validate_action_intent_state(handlerInput, state_change, DataTypes.GENE_DEFINITION);
            const params = { ...melvin_state };
            const response = await build_gene_definition_response(handlerInput, params);
            speechText = response["speech_text"];

        } catch (error) {
            if (error["speech"]) {
                speechText = error["speech"];
            } else {
                speechText = DEFAULT_GENERIC_ERROR_SPEECH_TEXT;
            }
            console.error("Error in NavigateGeneDefinitionIntent", error);
        }

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};

const NavigateGeneTargetIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "NavigateGeneTargetIntent";
    },
    async handle(handlerInput) {
        let speechText = "";

        try {
            const state_change = await update_melvin_state(handlerInput);
            const melvin_state = validate_action_intent_state(handlerInput, state_change, DataTypes.GENE_DEFINITION);
            const params = { ...melvin_state };
            const target_response = await build_gene_target_response(handlerInput, params);
            speechText = target_response["speech_text"];

        } catch (error) {
            if (error["speech"]) {
                speechText = error["speech"];
            } else {
                speechText = DEFAULT_GENERIC_ERROR_SPEECH_TEXT;
            }
            console.error("Error in NavigateGeneTargetIntent", error);
        }

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};

module.exports = {
    NavigateGeneDefinitionIntentHandler,
    NavigateGeneTargetIntentHandler
};