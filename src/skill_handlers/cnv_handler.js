const Speech = require('ssml-builder');

const { DataTypes, CNVTypes, DEFAULT_ERROR_SPEECH_TEXT } = require('../common.js');
const { add_to_APL_image_pager } = require('../utils/APL_utils.js');
const { build_cnv_response } = require('./cnv_helper.js');
const {
    validate_action_intent_state,
    update_melvin_state
} = require('./navigation_helper.js');

const CNVAmplificationGeneIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'CNVAmplificationGeneIntent';
    },
    async handle(handlerInput) {
        const gene_name = handlerInput.requestEnvelope.request.intent.slots.gene.value;
        const study_name = handlerInput.requestEnvelope.request.intent.slots.study.value;
        const study_id = handlerInput.requestEnvelope.request.intent.slots
            .study.resolutions.resolutionsPerAuthority[0].values[0].value.id;
        const params = { gene_name, study_name, study_id, cnv_change: CNVTypes.AMPLIFICATIONS };
        const cnv_response = await build_cnv_response(params);
        add_to_APL_image_pager(handlerInput, cnv_response['image_list']);
        speechText = cnv_response['speech_text'];

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};

const CNVDeletionGeneIntent = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'CNVDeletionGeneIntent';
    },
    async handle(handlerInput) {
        let gene_name = handlerInput.requestEnvelope.request.intent.slots.gene.value;
        let study_name = handlerInput.requestEnvelope.request.intent.slots.study.value;
        let study_id = handlerInput.requestEnvelope.request.intent.slots
            .study.resolutions.resolutionsPerAuthority[0].values[0].value.id;
        const params = { gene_name, study_name, study_id, cnv_change: CNVTypes.DELETIONS };
        const cnv_response = await build_cnv_response(params);
        add_to_APL_image_pager(handlerInput, cnv_response['image_list']);
        speechText = cnv_response['speech_text'];

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};

const CNVAlterationGeneIntent = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'CNVAlterationGeneIntent';
    },
    async handle(handlerInput) {
        let gene_name = handlerInput.requestEnvelope.request.intent.slots.gene.value;
        let study_name = handlerInput.requestEnvelope.request.intent.slots.study.value;
        let study_id = handlerInput.requestEnvelope.request.intent.slots
            .study.resolutions.resolutionsPerAuthority[0].values[0].value.id;
        const params = { gene_name, study_name, study_id, cnv_change: CNVTypes.ALTERATIONS };
        const cnv_response = await build_cnv_response(params);
        add_to_APL_image_pager(handlerInput, cnv_response['image_list']);
        speechText = cnv_response['speech_text'];

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};


const NavigateCNVIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'NavigateCNVIntent';
    },
    async handle(handlerInput) {
        let speechText = '';

        try {
            const state_change = await update_melvin_state(handlerInput);
            const melvin_state = validate_action_intent_state(handlerInput, state_change, DataTypes.CNV_ALTERATIONS);
            const params = {
                ...melvin_state,
                cnv_change: CNVTypes.ALTERATIONS
            };
            const cnv_response = await build_cnv_response(params);
            add_to_APL_image_pager(handlerInput, cnv_response['image_list']);
            speechText = cnv_response['speech_text'];

        } catch (error) {
            if (error['speech']) {
                speechText = error['speech'];
            } else {
                speechText = DEFAULT_ERROR_SPEECH_TEXT;
            }
            console.error(`Error in NavigateCNVIntentHandler`, error);
        }

        console.log("SPEECH TEXT = " + speechText);
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};


module.exports = {
    CNVAmplificationGeneIntentHandler,
    CNVDeletionGeneIntent,
    CNVAlterationGeneIntent,
    NavigateCNVIntentHandler
}