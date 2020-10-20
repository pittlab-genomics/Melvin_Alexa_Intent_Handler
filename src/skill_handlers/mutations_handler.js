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

const {
    build_indels_response,
    build_indels_domain_response
} = require("../mutations/indels_response_builder.js");


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

const NavigateMutationDomainsIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "NavigateMutationDomainsIntent";
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
            console.error("Error in NavigateMutationDomainsIntentHandler", error);
        }

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};

const NavigateIndelsIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "NavigateIndelsIntent";
    },
    async handle(handlerInput) {
        let speechText = "";

        try {
            const state_change = await update_melvin_state(handlerInput);
            const melvin_state = validate_action_intent_state(handlerInput, state_change, DataTypes.INDELS);
            const response = await build_indels_response(handlerInput, melvin_state);
            speechText = response["speech_text"];

        } catch (error) {
            if (error["speech"]) {
                speechText = error["speech"];
            } else {
                speechText = DEFAULT_GENERIC_ERROR_SPEECH_TEXT;
            }
            console.error(`NavigateIndelsIntentHandler: message: ${error.message}`, error);
        }

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};

const NavigateIndelDomainsIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "NavigateIndelDomainsIntent";
    },
    async handle(handlerInput) {
        let speechText = "";
        try {
            const state_change = await update_melvin_state(handlerInput);
            const melvin_state = validate_action_intent_state(handlerInput, state_change, DataTypes.PROTEIN_DOMAINS);
            const domain_response = await build_indels_domain_response(handlerInput, melvin_state);
            speechText = domain_response["speech_text"];

        } catch (error) {
            if (error["speech"]) {
                speechText = error["speech"];
            } else {
                speechText = DEFAULT_GENERIC_ERROR_SPEECH_TEXT;
            }
            console.error("Error in NavigateIndelDomainsIntentHandler", error);
        }

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};


module.exports = {
    NavigateMutationsIntentHandler,
    NavigateMutationDomainsIntentHandler,
    NavigateIndelsIntentHandler,
    NavigateIndelDomainsIntentHandler
};