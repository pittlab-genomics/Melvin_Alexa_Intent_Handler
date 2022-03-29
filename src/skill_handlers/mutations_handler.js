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

const { add_to_APL_text_pager } = require("../utils/APL_utils.js");

const {
    build_mutations_response,
    build_mutations_domain_response
} = require("../mutations/mutations_response_builder.js");

const {
    build_indels_response,
    build_indels_domain_response
} = require("../mutations/indels_response_builder.js");

const {
    build_snvs_response,
    build_snv_domains_response
} = require("../mutations/snvs_response_builder.js");


const NavigateMutationsIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "NavigateMutationsIntent";
    },
    async handle(handlerInput) {
        let speech_text = "";
        let reprompt_text = "";
        try {
            const state_change = await update_melvin_state(handlerInput);
            const melvin_state = validate_action_intent_state(handlerInput, state_change, DataTypes.MUTATIONS);
            let response = await build_mutations_response(handlerInput, melvin_state);
            const preferences = await handlerInput.attributesManager.getPersistentAttributes(true, {});
            const brief_mode_preference = _.has(preferences, "BRIEF_MODE") ? preferences["BRIEF_MODE"] : false;
            const opts = { "BRIEF_MODE": brief_mode_preference };
            response = build_text_speech_and_reprompt_response(response, opts);
            speech_text = response["speech_text"];
            reprompt_text = response["reprompt_text"];
            console.info(`[NavigateMutationsIntentHandler] response: ${JSON.stringify(response)}`);
        } catch (error) {
            speech_text = build_melvin_voice_response(_.get(error, "speech", DEFAULT_GENERIC_ERROR_SPEECH_TEXT));
            reprompt_text = build_melvin_voice_response(DEFAULT_ERROR_REPROMPT);
            add_to_APL_text_pager(handlerInput, "");
            console.error(`[NavigateMutationsIntentHandler] error: ${error.message}`, error);
        }

        return handlerInput.responseBuilder
            .speak(speech_text)
            .reprompt(reprompt_text)
            .withShouldEndSession(false)
            .getResponse();
    }
};

const NavigateMutationDomainsIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "NavigateMutationDomainsIntent";
    },
    async handle(handlerInput) {
        let speech_text = "";
        let reprompt_text = "";
        try {
            const state_change = await update_melvin_state(handlerInput);
            const melvin_state = validate_action_intent_state(handlerInput, state_change, DataTypes.PROTEIN_DOMAINS);
            let response = await build_mutations_domain_response(handlerInput, melvin_state);
            const preferences = await handlerInput.attributesManager.getPersistentAttributes(true, {});
            const brief_mode_preference = _.has(preferences, "BRIEF_MODE") ? preferences["BRIEF_MODE"] : false;
            const opts = { "BRIEF_MODE": brief_mode_preference };
            response = build_text_speech_and_reprompt_response(response, opts);
            speech_text = response["speech_text"];
            reprompt_text = response["reprompt_text"];
            console.info(`[NavigateMutationDomainsIntentHandler] response: ${JSON.stringify(response)}`);
        } catch (error) {
            speech_text = build_melvin_voice_response(_.get(error, "speech", DEFAULT_GENERIC_ERROR_SPEECH_TEXT));
            reprompt_text = build_melvin_voice_response(DEFAULT_ERROR_REPROMPT);
            add_to_APL_text_pager(handlerInput, "");
            console.error(`[NavigateMutationDomainsIntentHandler] error: ${error.message}`, error);
        }

        return handlerInput.responseBuilder
            .speak(speech_text)
            .reprompt(reprompt_text)
            .withShouldEndSession(false)
            .getResponse();
    }
};

const NavigateIndelsIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "NavigateIndelsIntent";
    },
    async handle(handlerInput) {
        let speech_text = "";
        let reprompt_text = "";
        try {
            const state_change = await update_melvin_state(handlerInput);
            const melvin_state = validate_action_intent_state(handlerInput, state_change, DataTypes.INDELS);
            let response = await build_indels_response(handlerInput, melvin_state);
            const preferences = await handlerInput.attributesManager.getPersistentAttributes(true, {});
            const brief_mode_preference = _.has(preferences, "BRIEF_MODE") ? preferences["BRIEF_MODE"] : false;
            const opts = { "BRIEF_MODE": brief_mode_preference };
            response = build_text_speech_and_reprompt_response(response, opts);
            speech_text = response["speech_text"];
            reprompt_text = response["reprompt_text"];
            console.info(`[NavigateIndelsIntentHandler] response: ${JSON.stringify(response)}`);
        } catch (error) {
            speech_text = build_melvin_voice_response(_.get(error, "speech", DEFAULT_GENERIC_ERROR_SPEECH_TEXT));
            reprompt_text = build_melvin_voice_response(DEFAULT_ERROR_REPROMPT);
            add_to_APL_text_pager(handlerInput, "");
            console.error(`[NavigateIndelsIntentHandler] error: ${error.message}`, error);
        }

        return handlerInput.responseBuilder
            .speak(speech_text)
            .reprompt(reprompt_text)
            .withShouldEndSession(false)
            .getResponse();
    }
};

const NavigateIndelDomainsIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "NavigateIndelDomainsIntent";
    },
    async handle(handlerInput) {
        let speech_text = "";
        let reprompt_text = "";
        try {
            const state_change = await update_melvin_state(handlerInput);
            const melvin_state = validate_action_intent_state(handlerInput, state_change, DataTypes.PROTEIN_DOMAINS);
            let response = await build_indels_domain_response(handlerInput, melvin_state);
            const preferences = await handlerInput.attributesManager.getPersistentAttributes(true, {});
            const brief_mode_preference = _.has(preferences, "BRIEF_MODE") ? preferences["BRIEF_MODE"] : false;
            const opts = { "BRIEF_MODE": brief_mode_preference };
            response = build_text_speech_and_reprompt_response(response, opts);
            speech_text = response["speech_text"];
            reprompt_text = response["reprompt_text"];
            console.info(`[NavigateIndelDomainsIntentHandler] response: ${JSON.stringify(response)}`);
        } catch (error) {
            speech_text = build_melvin_voice_response(_.get(error, "speech", DEFAULT_GENERIC_ERROR_SPEECH_TEXT));
            reprompt_text = build_melvin_voice_response(DEFAULT_ERROR_REPROMPT);
            add_to_APL_text_pager(handlerInput, "");
            console.error(`[NavigateIndelDomainsIntentHandler] error: ${error.message}`, error);
        }

        return handlerInput.responseBuilder
            .speak(speech_text)
            .reprompt(reprompt_text)
            .withShouldEndSession(false)
            .getResponse();
    }
};

const NavigateSNVsIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "NavigateSNVsIntent";
    },
    async handle(handlerInput) {
        let speech_text = "";
        let reprompt_text = "";
        try {
            const state_change = await update_melvin_state(handlerInput);
            const melvin_state = validate_action_intent_state(handlerInput, state_change, DataTypes.SNV);
            let response = await build_snvs_response(handlerInput, melvin_state);
            const preferences = await handlerInput.attributesManager.getPersistentAttributes(true, {});
            const brief_mode_preference = _.has(preferences, "BRIEF_MODE") ? preferences["BRIEF_MODE"] : false;
            const opts = { "BRIEF_MODE": brief_mode_preference };
            response = build_text_speech_and_reprompt_response(response, opts);
            speech_text = response["speech_text"];
            reprompt_text = response["reprompt_text"];
            console.info(`[NavigateSNVsIntentHandler] response: ${JSON.stringify(response)}`);
        } catch (error) {
            speech_text = build_melvin_voice_response(_.get(error, "speech", DEFAULT_GENERIC_ERROR_SPEECH_TEXT));
            reprompt_text = build_melvin_voice_response(DEFAULT_ERROR_REPROMPT);
            add_to_APL_text_pager(handlerInput, "");
            console.error(`[NavigateSNVsIntentHandler] error: ${error.message}`, error);
        }

        return handlerInput.responseBuilder
            .speak(speech_text)
            .reprompt(reprompt_text)
            .withShouldEndSession(false)
            .getResponse();
    }
};

const NavigateSNVDomainsIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "NavigateSNVDomainsIntent";
    },
    async handle(handlerInput) {
        let speech_text = "";
        let reprompt_text = "";
        try {
            const state_change = await update_melvin_state(handlerInput);
            const melvin_state = validate_action_intent_state(handlerInput, state_change, DataTypes.PROTEIN_DOMAINS);
            let response = await build_snv_domains_response(handlerInput, melvin_state);
            const preferences = await handlerInput.attributesManager.getPersistentAttributes(true, {});
            const brief_mode_preference = _.has(preferences, "BRIEF_MODE") ? preferences["BRIEF_MODE"] : false;
            const opts = { "BRIEF_MODE": brief_mode_preference };
            response = build_text_speech_and_reprompt_response(response, opts);
            speech_text = response["speech_text"];
            reprompt_text = response["reprompt_text"];
            console.info(`[NavigateSNVDomainsIntentHandler] response: ${JSON.stringify(response)}`);
        } catch (error) {
            speech_text = build_melvin_voice_response(_.get(error, "speech", DEFAULT_GENERIC_ERROR_SPEECH_TEXT));
            reprompt_text = build_melvin_voice_response(DEFAULT_ERROR_REPROMPT);
            add_to_APL_text_pager(handlerInput, "");
            console.error(`[NavigateSNVDomainsIntentHandler] error: ${error.message}`, error);
        }

        return handlerInput.responseBuilder
            .speak(speech_text)
            .reprompt(reprompt_text)
            .withShouldEndSession(false)
            .getResponse();
    }
};


module.exports = {
    NavigateMutationsIntentHandler,
    NavigateMutationDomainsIntentHandler,
    NavigateIndelsIntentHandler,
    NavigateIndelDomainsIntentHandler,
    NavigateSNVsIntentHandler,
    NavigateSNVDomainsIntentHandler
};