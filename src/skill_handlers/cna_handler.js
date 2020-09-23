const {
    DataTypes,
    CNATypes,
    DEFAULT_GENERIC_ERROR_SPEECH_TEXT
} = require("../common.js");

const { build_navigate_cna_response } = require("../cna/response_builder.js");

const {
    validate_action_intent_state,
    update_melvin_state
} = require("../utils/navigation_utils.js");


const NavigateCNAIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "NavigateCNAIntent";
    },
    async handle(handlerInput) {
        let speechText = "";

        try {
            const state_change = await update_melvin_state(handlerInput);
            const melvin_state = validate_action_intent_state(handlerInput, state_change, DataTypes.CNA);
            const params = {
                ...melvin_state,
                cna_change: CNATypes.ALTERATIONS
            };
            const cna_response = await build_navigate_cna_response(handlerInput, params);
            speechText = cna_response["speech_text"];

        } catch (error) {
            if (error["speech"]) {
                speechText = error["speech"];
            } else {
                speechText = DEFAULT_GENERIC_ERROR_SPEECH_TEXT;
            }
            console.error("Error in NavigateCNAIntentHandler", error);
        }

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};

const NavigateCNAAmplificationsIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "NavigateCNAAmplificationsIntent";
    },
    async handle(handlerInput) {
        let speechText = "";

        try {
            const state_change = await update_melvin_state(handlerInput);
            const melvin_state = validate_action_intent_state(handlerInput, state_change, DataTypes.GAIN);
            const params = {
                ...melvin_state,
                cna_change: CNATypes.AMPLIFICATIONS
            };
            const cna_response = await build_navigate_cna_response(handlerInput, params);
            speechText = cna_response["speech_text"];

        } catch (error) {
            if (error["speech"]) {
                speechText = error["speech"];
            } else {
                speechText = DEFAULT_GENERIC_ERROR_SPEECH_TEXT;
            }
            console.error("Error in NavigateCNAAmplificationsIntent", error);
        }

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};

const NavigateCNADeletionsIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "NavigateCNADeletionsIntent";
    },
    async handle(handlerInput) {
        let speechText = "";

        try {
            const state_change = await update_melvin_state(handlerInput);
            const melvin_state = validate_action_intent_state(handlerInput, state_change, DataTypes.LOSS);
            const params = {
                ...melvin_state,
                cna_change: CNATypes.DELETIONS
            };
            const cna_response = await build_navigate_cna_response(handlerInput, params);
            speechText = cna_response["speech_text"];

        } catch (error) {
            if (error["speech"]) {
                speechText = error["speech"];
            } else {
                speechText = DEFAULT_GENERIC_ERROR_SPEECH_TEXT;
            }
            console.error("Error in NavigateCNADeletionsIntent", error);
        }

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};


module.exports = {
    NavigateCNAIntentHandler,
    NavigateCNAAmplificationsIntentHandler,
    NavigateCNADeletionsIntentHandler
};