const {
    MelvinAttributes,
    DataTypes,
    DataSources,
    CNATypes,
    DEFAULT_GENERIC_ERROR_SPEECH_TEXT
} = require("../common.js");

const { build_navigate_cna_response } = require("../cna/response_builder.js");

const {
    validate_action_intent_state,
    update_melvin_state
} = require("../utils/navigation_utils.js");

const CNAAmplificationGeneIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "CNAAmplificationGeneIntent";
    },
    async handle(handlerInput) {
        const params = {
            [MelvinAttributes.DSOURCE]:     DataSources.TCGA,
            [MelvinAttributes.GENE_NAME]:   handlerInput.requestEnvelope.request.intent.slots.gene.value,
            [MelvinAttributes.STUDY_ABBRV]: handlerInput.requestEnvelope.request.intent.slots
                .study.resolutions.resolutionsPerAuthority[0].values[0].value.id,
            cna_change: CNATypes.AMPLIFICATIONS
        };
        const cna_response = await build_navigate_cna_response(handlerInput, params);
        const speechText = cna_response["speech_text"];

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};

const CNADeletionGeneIntent = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "CNADeletionGeneIntent";
    },
    async handle(handlerInput) {
        const params = {
            [MelvinAttributes.GENE_NAME]:   handlerInput.requestEnvelope.request.intent.slots.gene.value,
            [MelvinAttributes.STUDY_ABBRV]: handlerInput.requestEnvelope.request.intent.slots
                .study.resolutions.resolutionsPerAuthority[0].values[0].value.id,
            cna_change: CNATypes.DELETIONS
        };
        const cna_response = await build_navigate_cna_response(handlerInput, params);
        const speechText = cna_response["speech_text"];

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};

const CNAAlterationGeneIntent = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "CNAAlterationGeneIntent";
    },
    async handle(handlerInput) {
        const params = {
            [MelvinAttributes.GENE_NAME]:   handlerInput.requestEnvelope.request.intent.slots.gene.value,
            [MelvinAttributes.STUDY_ABBRV]: handlerInput.requestEnvelope.request.intent.slots
                .study.resolutions.resolutionsPerAuthority[0].values[0].value.id,
            cna_change: CNATypes.ALTERATIONS
        };
        const cna_response = await build_navigate_cna_response(handlerInput, params);
        const speechText = cna_response["speech_text"];

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};


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
    CNAAmplificationGeneIntentHandler,
    CNADeletionGeneIntent,
    CNAAlterationGeneIntent,
    NavigateCNAIntentHandler,
    NavigateCNAAmplificationsIntentHandler,
    NavigateCNADeletionsIntentHandler
};