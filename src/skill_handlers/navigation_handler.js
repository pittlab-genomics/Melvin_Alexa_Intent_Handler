const Speech = require('ssml-builder');
const _ = require('lodash');

const {
    DataTypes,
    CNVTypes,
    MelvinIntentErrors,
    melvin_error,
    MELVIN_WELCOME_GREETING,
    MELVIN_APP_NAME,
    get_gene_speech_text
} = require('../common.js');

const { build_mutations_response, build_mutations_domain_response } = require('./mutations_helper.js');
const { update_melvin_state, validate_navigation_intent_state } = require('./navigation_helper.js');
const { add_to_APL_image_pager } = require('../utils/APL_utils.js');
const { build_navigate_cnv_response } = require('./cnv_helper.js');

function ack_attribute_change(handlerInput, oov_data) {
    let speechText = '';
    if (oov_data['entity_type'] === 'GENE') {
        const gene_name = oov_data['entity_data']['gene_name'];
        const gene_speech_text = get_gene_speech_text(gene_name);
        speechText = `Ok, ${gene_speech_text}. What would you like to know?`
        handlerInput.responseBuilder.withSimpleCard(MELVIN_APP_NAME, gene_name);

    } else if (oov_data['entity_type'] === 'STUDY') {
        const study_name = oov_data['entity_data']['study_name'];
        speechText = `Ok, ${study_name}. What would you like to know?`;
        handlerInput.responseBuilder.withSimpleCard(MELVIN_APP_NAME, `${study_name}`);

    } else if (oov_data['entity_type'] === 'DTYPE') {
        const dtype = oov_data['entity_data']['dtype'];
        speechText = `Ok, ${dtype}. What would you like to know?`;
        handlerInput.responseBuilder.withSimpleCard(MELVIN_APP_NAME, `${dtype}`);
    }

    return {
        'speech_text': speechText
    };
}

const NavigateStartIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'NavigateStartIntent';
    },
    async handle(handlerInput) {
        let speechText = '';
        try {
            const state_change = await update_melvin_state(handlerInput);
            validate_navigation_intent_state(handlerInput, state_change);
            const oov_data = state_change['oov_data'];
            const response = ack_attribute_change(handlerInput, oov_data);
            speechText = response['speech_text'];

        } catch (error) {
            if (error['speech']) {
                speechText = error['speech'];
            } else {
                speechText = "Sorry, something went wrong while processing the request. Please try again later.";
            }
            console.error(`Error in NavigateStartIntentHandler`, error);
        }

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};


const NavigateJoinFilterIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'NavigateJoinFilterIntent';
    },
    async handle(handlerInput) {
        let speechText = '';
        try {
            const state_change = await update_melvin_state(handlerInput);
            const melvin_state = validate_navigation_intent_state(handlerInput, state_change);
            let response = {};
            if (_.isEmpty(melvin_state['data_type'])) {
                response = ack_attribute_change(handlerInput, state_change['oov_data']);

            } else {
                if (melvin_state['data_type'] === 'mutation'
                    || melvin_state['data_type'] === DataTypes.MUTATIONS) {
                    response = await build_mutations_response(melvin_state);

                } else if (melvin_state['data_type'] === 'domain'
                    || melvin_state['data_type'] === DataTypes.MUTATION_DOMAINS) {
                    response = await build_mutations_domain_response(melvin_state);

                } else if (melvin_state['data_type'] === 'amplification'
                    || melvin_state['data_type'] === DataTypes.CNV_AMPLIFICATIONS) {
                    const params = {
                        ...melvin_state,
                        cnv_change: CNVTypes.APLIFICATIONS
                    };
                    response = await build_navigate_cnv_response(params);

                } else if (melvin_state['data_type'] === 'deletion'
                    || melvin_state['data_type'] === DataTypes.CNV_DELETIONS) {
                    const params = {
                        ...melvin_state,
                        cnv_change: CNVTypes.DELETIONS
                    };
                    response = await build_navigate_cnv_response(params);

                } else if (melvin_state['data_type'] === 'copy number change'
                    || melvin_state['data_type'] === 'copy number variation'
                    || melvin_state['data_type'] === 'copy number alteration'
                    || melvin_state['data_type'] === DataTypes.CNV_ALTERATIONS) {
                    const params = {
                        ...melvin_state,
                        cnv_change: CNVTypes.ALTERATIONS
                    };
                    response = await build_navigate_cnv_response(params);

                } else {
                    throw melvin_error(`Unknown data_type found in melvin_state: ${JSON.stringify(melvin_state)}`,
                        MelvinIntentErrors.INVALID_DATA_TYPE);
                }
                add_to_APL_image_pager(handlerInput, response['image_list']);
            }

            console.log(`[NavigateJoinFilterIntentHandler] response = ${JSON.stringify(response)}`);
            speechText = response['speech_text'];

        } catch (error) {
            if (error['speech']) {
                speechText = error['speech'];
            } else {
                speechText = "Sorry, something went wrong while processing the request. Please try again later.";
            }
            console.error(`Error in NavigateJoinFilterIntentHandler`, error);
        }

        console.log("SPEECH TEXT = " + speechText);
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
}

const NavigateResetIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'NavigateReset';
    },
    async handle(handlerInput) {
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        const speechText = `Ok. ${MELVIN_WELCOME_GREETING}`;
        const reprompt_text = 'What would you like to know? You can ask me about a gene or a cancer type.'
        sessionAttributes['MELVIN.STATE'] = {};
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(reprompt_text)
            .withStandardCard(`Welcome to ${MELVIN_APP_NAME}`, 'You can start with a gene or cancer type.')
            .getResponse();
    }
};

module.exports = {
    NavigateStartIntentHandler,
    NavigateResetIntentHandler,
    NavigateJoinFilterIntentHandler
}