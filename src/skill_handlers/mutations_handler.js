const {
    DataTypes,
    DEFAULT_GENERIC_ERROR_SPEECH_TEXT
} = require("../common.js");

const {
    validate_action_intent_state,
    update_melvin_state
} = require("../utils/navigation_utils.js");

const {
    build_mutations_response,
    build_mutations_domain_response
} = require("../mutations/response_builder.js");


const NavigateMutationsIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "NavigateMutationsIntent";
    },
    async handle(handlerInput) {
        let speechText = "";

        try {
            const state_change = await update_melvin_state(handlerInput);
            const melvin_state = validate_action_intent_state(handlerInput, state_change, DataTypes.MUTATIONS);
            const response = await build_mutations_response(handlerInput, melvin_state);
            speechText = response["speech_text"];

        } catch (error) {
            if (error["speech"]) {
                speechText = error["speech"];
            } else {
                speechText = DEFAULT_GENERIC_ERROR_SPEECH_TEXT;
            }
            console.error(`NavigateMutationsIntentHandler: message: ${error.message}`, error);
        }

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};

const NavigateMutationsDomainIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "NavigateMutationsDomainIntent";
    },
    async handle(handlerInput) {
        let speechText = "";
        try {
            const state_change = await update_melvin_state(handlerInput);
            const melvin_state = validate_action_intent_state(handlerInput, state_change, DataTypes.PROTEIN_DOMAINS);
            const domain_response = await build_mutations_domain_response(handlerInput, melvin_state);
            speechText = domain_response["speech_text"];

        } catch (error) {
            if (error["speech"]) {
                speechText = error["speech"];
            } else {
                speechText = DEFAULT_GENERIC_ERROR_SPEECH_TEXT;
            }
            console.error("Error in NavigateMutationsDomainIntentHandler", error);
        }

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};

module.exports = {
    NavigateMutationsIntentHandler,
    NavigateMutationsDomainIntentHandler
};