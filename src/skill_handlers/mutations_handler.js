const Speech = require('ssml-builder');
const { quickQueryRepromptText } = require('../common.js');
const { get_mutated_patient_stats } = require('../http_clients/mutations_client.js');
var _ = require('lodash');

const MutationCountIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && (handlerInput.requestEnvelope.request.intent.name === 'MutationGeneCountIntent' ||
                handlerInput.requestEnvelope.request.intent.name === 'MutationStudyGeneCountIntent');
    },
    async handle(handlerInput) {

        let speechText = '';
        let speech = new Speech();

        try {
            let gene_name = _.get(handlerInput, 'requestEnvelope.request.intent.slots.gene.value');
            let params = { gene_name };

            let study = _.get(handlerInput, 'requestEnvelope.request.intent.slots.study.value');
            if (!_.isNil(study)) {
                let study_name = handlerInput.requestEnvelope.request.intent.slots.study.value;
                let study_id = handlerInput.requestEnvelope.request.intent.slots
                    .study.resolutions.resolutionsPerAuthority[0].values[0].value.id;
                params['study_name'] = study_name;
                params['study_id'] = study_id;
            }

            let response = await get_mutated_patient_stats(params);
            if (response['data']['patient_count'] && !_.isNil(study)) {
                speech.say(`${response.data.patient_count} ${study} cancer patients have ${gene_name} mutation.`);
                speechText = speech.ssml();

            } else if (response['data']['patient_count'] && _.isNil(study)) {
                speech.say(`${response.data.patient_count} patients have ${gene_name} mutation.`);
                speechText = speech.ssml();

            } else if (response['error'] && response['error'] === 'UNIDENTIFIED_GENE') {
                speech.say(`Sorry, I could not find a gene called ${gene_name}`);
                speechText = speech.ssml();

            } else {
                speech.say(`Sorry, there was a problem while fetching the data. Please try again.`);
                speechText = speech.ssml();
            }

        } catch (error) {
            speech.say(`Sorry, something went wrong while processing the request. Please try again later.`);
            speechText = speech.ssml();
            console.error(`MutationCountIntentHandler: message: ${error.message}`, error);
        }

        console.log("SPEECH TEXT = " + speechText);
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(quickQueryRepromptText)
            .getResponse();
    }
};

const MutationPercentageIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && (handlerInput.requestEnvelope.request.intent.name === 'MutationGenePercentIntent' ||
                handlerInput.requestEnvelope.request.intent.name === 'MutationStudyGenePercentIntent');
    },
    async handle(handlerInput) {

        let speechText = '';
        let speech = new Speech();

        try {
            let gene_name = _.get(handlerInput, 'requestEnvelope.request.intent.slots.gene.value');
            let params = { gene_name };

            let study = _.get(handlerInput, 'requestEnvelope.request.intent.slots.study.value');
            if (!_.isNil(study)) {
                let study_name = handlerInput.requestEnvelope.request.intent.slots.study.value;
                let study_id = handlerInput.requestEnvelope.request.intent.slots
                    .study.resolutions.resolutionsPerAuthority[0].values[0].value.id;
                params['study_name'] = study_name;
                params['study_id'] = study_id;
            }

            let response = await get_mutated_patient_stats(params);
            if (response['data']['patient_percentage'] && !_.isNil(study)) {
                speech
                    .sayAs({ word: response['data']['patient_percentage'], interpret: 'digits' })
                    .say(`percentage of ${study} cancer patients have ${gene_name} mutation.`);
                speechText = speech.ssml();

            } else if (response['data']['patient_percentage'] && _.isNil(study)) {
                speech
                    .sayAs({ word: response['data']['patient_percentage'], interpret: 'digits' })
                    .say(`percentage of patients have ${gene_name} mutation.`);
                speechText = speech.ssml();

            } else if (response['error'] && response['error'] === 'UNIDENTIFIED_GENE') {
                speech.say(`Sorry, I could not find a gene called ${gene_name}`);
                speechText = speech.ssml();

            } else {
                speech.say(`Sorry, there was a problem while fetching the data. Please try again.`);
                speechText = speech.ssml();
            }

        } catch (error) {
            speech.say(`Sorry, something went wrong while processing the request. Please try again later.`);
            speechText = speech.ssml();
            console.error(`MutationCountIntentHandler: message: ${error.message}`, error);
        }

        console.log("SPEECH TEXT = " + speechText);
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(quickQueryRepromptText)
            .getResponse();
    }
};

const NavigateMutationsIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'NavigateMutationsIntent';
    },
    handle(handlerInput) {
        const gene_name = handlerInput.requestEnvelope.request.intent.slots.gene.value;

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};

module.exports = {
    MutationCountIntentHandler,
    MutationPercentageIntentHandler,
    NavigateMutationsIntentHandler
}