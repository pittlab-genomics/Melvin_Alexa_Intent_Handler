const Speech = require('ssml-builder');
const _ = require('lodash');
const yaml = require('js-yaml');

const { get_oov_mapping_by_query } = require('../http_clients/oov_mapper_client.js');
const {
    MelvinIntentErrors,
    OOVEntityTypes,
    RequiredAttributes,
    DataTypes,
    melvin_error
} = require('../common.js');

const NAVIGATION_TOPICS = yaml.load('../../resources/navigation/topics.yml');


const update_melvin_state = async function (handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    let prev_melvin_state, new_melvin_state, oov_data;
    prev_melvin_state = new_melvin_state = oov_data = {};

    if (sessionAttributes['MELVIN.STATE']) {
        prev_melvin_state = sessionAttributes['MELVIN.STATE'];
    }

    const query = _.get(handlerInput, 'requestEnvelope.request.intent.slots.query.value');
    if (!_.isEmpty(query)) {
        try {
            const params = { query };
            const query_response = await get_oov_mapping_by_query(params);

            if (query_response['data']['entity_type'] === OOVEntityTypes.GENE) {
                const gene_name = _.get(query_response, "data.entity_data.gene_name");
                new_melvin_state['gene_name'] = gene_name;

            } else if (query_response['data']['entity_type'] === OOVEntityTypes.STUDY) {
                const study_name = _.get(query_response, "data.entity_data.study_name");
                const study_id = _.get(query_response, "data.entity_data.study_id");
                new_melvin_state['study_name'] = study_name;
                new_melvin_state['study_id'] = study_id;

            } else if (query_response['data']['entity_type'] === OOVEntityTypes.DTYPE) {
                const dtype = _.get(query_response, "data.entity_data.dtype");
                new_melvin_state['data_type'] = dtype;
            }
            oov_data = query_response['data'];

            console.log(`[update_melvin_state] prev_melvin_state: ${JSON.stringify(prev_melvin_state)},` +
                `new_melvin_state: ${JSON.stringify(new_melvin_state)}`);

        } catch (error) {
            console.error(`update_melvin_state: message: ${error.message}`, error);
            throw melvin_error(`Error while mapping query: ${query}`, MelvinIntentErrors.OOV_ERROR,
                "Sorry, something went wrong while processing the query utterance. Please try again later.");
        }
    }

    return {
        "prev_melvin_state": prev_melvin_state,
        "new_melvin_state": new_melvin_state,
        "oov_data": oov_data
    }
}

function validate_required_attributes(melvin_state) {
    let key = '';
    if (melvin_state['data_type'] === 'mutation'
        || melvin_state['data_type'] === DataTypes.MUTATIONS) {
        key = DataTypes.MUTATIONS;

    } else if (melvin_state['data_type'] === 'domain'
        || melvin_state['data_type'] === DataTypes.MUTATION_DOMAINS) {
        key = DataTypes.MUTATION_DOMAINS;

    } else if (melvin_state['data_type'] === 'amplification'
        || melvin_state['data_type'] === DataTypes.CNV_AMPLIFICATIONS) {
        key = DataTypes.CNV_AMPLIFICATIONS;

    } else if (melvin_state['data_type'] === 'deletion'
        || melvin_state['data_type'] === DataTypes.CNV_DELETIONS) {
        key = DataTypes.CNV_DELETIONS;

    } else if (melvin_state['data_type'] === 'copy number change'
        || melvin_state['data_type'] === 'copy number variation'
        || melvin_state['data_type'] === 'copy number alteration'
        || melvin_state['data_type'] === DataTypes.CNV_ALTERATIONS) {
        key = DataTypes.CNV_ALTERATIONS;
    }

    const has_gene = RequiredAttributes[key]['has_gene'];
    const has_study = RequiredAttributes[key]['has_study'];

    if (has_gene && _.isEmpty(melvin_state['gene_name'])) {
        let error = new Error('Error while validating required attributes in melvin_state', melvin_state);
        error.type = MelvinIntentErrors.MISSING_GENE;
        error.speech = "I need to know a gene name first. What gene are you interested in?";
        throw error;
    }

    if (has_study && _.isEmpty(melvin_state['study_id'])) {
        let error = new Error('Error while validating required attributes in melvin_state', melvin_state);
        error.type = MelvinIntentErrors.MISSING_STUDY;
        error.speech = "I need to know a cancer type first. What cancer type are you interested in?";
        throw error;
    }
}

const validate_navigation_intent_state = function (handlerInput, state_change) {
    console.log(`validate_navigation_intent_state | state_change: ${JSON.stringify(state_change)}`);
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    if (_.isEmpty(state_change['oov_data']['entity_data'])) {
        let error = new Error('Error while validating oov_data in state_change', state_change);
        error.type = MelvinIntentErrors.MISSING_GENE;
        error.speech = "Sorry, I did not understand that query.";
        throw error;
    }

    // merge the previous state and new state. Overwrite with the latest
    const melvin_state = { ...state_change['prev_melvin_state'], ...state_change['new_melvin_state'] };

    sessionAttributes['MELVIN.STATE'] = melvin_state;
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
    console.log(`validate_navigation_intent_state | melvin_state: ${JSON.stringify(melvin_state)}`);

    if (!_.isEmpty(melvin_state['data_type'])) {
        validate_required_attributes(melvin_state);
    }

    return melvin_state;
}

const validate_action_intent_state = function (handlerInput, state_change, intent_data_type) {
    console.log(`validate_action_intent_state | state_change: ${JSON.stringify(state_change)}`);
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    if (state_change['oov_data']['entity_type'] === OOVEntityTypes.DTYPE) {
        let error = new Error('Error while validating action intent state', state_change);
        error.type = MelvinIntentErrors.INVALID_ENTITY_TYPE;
        error.speech = "Your query is invalid. A data type cannot be used in an action intent";
        throw error;
    }

    // merge the previous state and new state. Overwrite with the latest
    const melvin_state = { ...state_change['prev_melvin_state'], ...state_change['new_melvin_state'] };
    melvin_state['data_type'] = intent_data_type;
    sessionAttributes['MELVIN.STATE'] = melvin_state;
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
    validate_required_attributes(melvin_state);
    console.log(`validate_action_intent_state | melvin_state: ${JSON.stringify(melvin_state)}`);
    return melvin_state;
}

module.exports = {
    NAVIGATION_TOPICS,
    update_melvin_state,
    validate_navigation_intent_state,
    validate_action_intent_state,
}