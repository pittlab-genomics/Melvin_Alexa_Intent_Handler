const _ = require("lodash");

const {
    DataTypes,
    CNATypes,
    DEFAULT_GENERIC_ERROR_SPEECH_TEXT,
    DEFAULT_ERROR_REPROMPT
} = require("../common.js");

const { build_cna_response } = require("../cna/cna_response_builder.js");
const { build_gain_response } = require("../cna/gain_response_builder.js");
const { build_loss_response } = require("../cna/loss_response_builder.js");

const {
    validate_action_intent_state,
    update_melvin_state
} = require("../utils/navigation_utils.js");

const {
    build_melvin_voice_response, build_text_speech_and_reprompt_response 
} = require("../utils/response_builder_utils.js");
const { add_to_APL_text_pager } = require("../utils/APL_utils.js");

const NavigateCNAIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "NavigateCNAIntent";
    },
    async handle(handlerInput) {
        let speech_text = "";
        let reprompt_text = "";
        try {
            const state_change = await update_melvin_state(handlerInput);
            const melvin_state = validate_action_intent_state(handlerInput, state_change, DataTypes.CNA);
            const params = {
                ...melvin_state,
                cna_change: CNATypes.ALTERATIONS
            };
            let response = await build_cna_response(handlerInput, params);
            const preferences = await handlerInput.attributesManager.getPersistentAttributes(true, {});
            const brief_mode_preference = _.has(preferences, "BRIEF_MODE") ? preferences["BRIEF_MODE"] : false;
            const opts = { "BRIEF_MODE": brief_mode_preference };
            response = build_text_speech_and_reprompt_response(response, opts);
            speech_text = response["speech_text"];
            reprompt_text = response["reprompt_text"];
            console.info(`[NavigateCNAIntentHandler] response: ${JSON.stringify(response)}`);
        } catch (error) {
            speech_text = build_melvin_voice_response(_.get(error, "speech", DEFAULT_GENERIC_ERROR_SPEECH_TEXT));
            reprompt_text = build_melvin_voice_response(DEFAULT_ERROR_REPROMPT);
            add_to_APL_text_pager(handlerInput, "");
            console.error(`[NavigateCNAIntentHandler] error: ${error.message}`, error);
        }

        return handlerInput.responseBuilder
            .speak(speech_text)
            .reprompt(reprompt_text)
            .withShouldEndSession(false)
            .getResponse();
    }
};

const NavigateGainIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "NavigateGainIntent";
    },
    async handle(handlerInput) {
        let speech_text = "";
        let reprompt_text = "";
        try {
            const state_change = await update_melvin_state(handlerInput);
            const melvin_state = validate_action_intent_state(handlerInput, state_change, DataTypes.GAIN);
            const params = {
                ...melvin_state,
                cna_change: CNATypes.AMPLIFICATIONS
            };
            let response = await build_gain_response(handlerInput, params);
            const preferences = await handlerInput.attributesManager.getPersistentAttributes(true, {});
            const brief_mode_preference = _.has(preferences, "BRIEF_MODE") ? preferences["BRIEF_MODE"] : false;
            const opts = { "BRIEF_MODE": brief_mode_preference };
            response = build_text_speech_and_reprompt_response(response, opts);
            speech_text = response["speech_text"];
            reprompt_text = response["reprompt_text"];
            console.info(`[NavigateGainIntentHandler] response: ${JSON.stringify(response)}`);
        } catch (error) {
            speech_text = build_melvin_voice_response(_.get(error, "speech", DEFAULT_GENERIC_ERROR_SPEECH_TEXT));
            reprompt_text = build_melvin_voice_response(DEFAULT_ERROR_REPROMPT);
            add_to_APL_text_pager(handlerInput, "");
            console.error(`[NavigateGainIntentHandler] error: ${error.message}`, error);
        }

        return handlerInput.responseBuilder
            .speak(speech_text)
            .reprompt(reprompt_text)
            .withShouldEndSession(false)
            .getResponse();
    }
};

const NavigateLossIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "NavigateLossIntent";
    },
    async handle(handlerInput) {
        let speech_text = "";
        let reprompt_text = "";
        try {
            const state_change = await update_melvin_state(handlerInput);
            const melvin_state = validate_action_intent_state(handlerInput, state_change, DataTypes.LOSS);
            const params = {
                ...melvin_state,
                cna_change: CNATypes.DELETIONS
            };
            let response = await build_loss_response(handlerInput, params);
            const preferences = await handlerInput.attributesManager.getPersistentAttributes(true, {});
            const brief_mode_preference = _.has(preferences, "BRIEF_MODE") ? preferences["BRIEF_MODE"] : false;
            const opts = { "BRIEF_MODE": brief_mode_preference };
            response = build_text_speech_and_reprompt_response(response, opts);
            speech_text = response["speech_text"];
            reprompt_text = response["reprompt_text"];
            console.info(`[NavigateGainIntentHandler] response: ${JSON.stringify(response)}`);
        } catch (error) {
            speech_text = build_melvin_voice_response(_.get(error, "speech", DEFAULT_GENERIC_ERROR_SPEECH_TEXT));
            reprompt_text = build_melvin_voice_response(DEFAULT_ERROR_REPROMPT);
            add_to_APL_text_pager(handlerInput, "");
            console.error(`[NavigateLossIntentHandler] error: ${error.message}`, error);
        }

        return handlerInput.responseBuilder
            .speak(speech_text)
            .reprompt(reprompt_text)
            .withShouldEndSession(false)
            .getResponse();
    }
};


module.exports = {
    NavigateCNAIntentHandler,
    NavigateGainIntentHandler,
    NavigateLossIntentHandler
};