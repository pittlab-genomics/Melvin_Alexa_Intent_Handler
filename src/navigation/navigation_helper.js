const Speech = require('ssml-builder');
const _ = require('lodash');
const yaml = require('js-yaml');
const moment = require('moment');

const utterances_doc = require('../dao/utterances.js');
const { get_oov_mapping_by_query } = require('../http_clients/oov_mapper_client.js');
const {
    MELVIN_MAX_HISTORY_ITEMS,
    FOLLOW_UP_TEXT_THRESHOLD,
    MelvinAttributes,
    MelvinIntentErrors,
    OOVEntityTypes,
    RequiredAttributesTCGA,
    RequiredAttributesClinvar,
    DataTypes,
    DataSources,
    melvin_error,
    CNVTypes,
    get_gene_speech_text,
    MELVIN_APP_NAME
} = require('../common.js');

const { get_event_type } = require('./handler_configuration.js');

const { build_navigate_cnv_response } = require('../cnvs/cnv_helper.js');
const { build_gene_definition_response } = require('../skill_handlers/gene_handler.js');
const { build_sv_response } = require('../structural_variants/sv_helper.js');
const { build_overview_response } = require('../overview/overview_helper.js');
const { build_mutations_response, build_mutations_domain_response } = require('../mutations/mutations_helper.js');


const NAVIGATION_TOPICS = yaml.load('../../resources/navigation/topics.yml');

const get_melvin_state = function (handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    let melvin_state = {};
    if (sessionAttributes['MELVIN.STATE']) {
        melvin_state = sessionAttributes['MELVIN.STATE'];
    }
    return melvin_state;
}

const get_melvin_history = function (handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    let melvin_history = [];
    if (sessionAttributes['MELVIN.HISTORY']) {
        melvin_history = sessionAttributes['MELVIN.HISTORY'];
    }
    return melvin_history;
}

const update_melvin_state = async function (handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    let prev_melvin_state, new_melvin_state, oov_data;
    prev_melvin_state = new_melvin_state = oov_data = {};

    if (_.has(sessionAttributes, 'MELVIN.STATE')) {
        prev_melvin_state = sessionAttributes['MELVIN.STATE'];
    }

    if (!_.has(prev_melvin_state, MelvinAttributes.DSOURCE)) {
        // default to TCGA data source
        prev_melvin_state[MelvinAttributes.DSOURCE] = DataSources.TCGA;
    }

    const query = _.get(handlerInput, 'requestEnvelope.request.intent.slots.query.value');
    if (!_.isEmpty(query)) {
        try {
            const params = { query };
            const query_response = await get_oov_mapping_by_query(params);
            oov_data = query_response['data'];

            if (query_response['data']['entity_type'] === OOVEntityTypes.GENE) {
                new_melvin_state[MelvinAttributes.GENE_NAME] = _.get(
                    query_response, "data.entity_data.value");

            } else if (query_response['data']['entity_type'] === OOVEntityTypes.STUDY) {
                new_melvin_state[MelvinAttributes.STUDY_NAME] = _.get(
                    query_response, "data.entity_data.study_name");
                new_melvin_state[MelvinAttributes.STUDY_ABBRV] = _.get(
                    query_response, "data.entity_data.value");

            } else if (query_response['data']['entity_type'] === OOVEntityTypes.DTYPE) {
                new_melvin_state[MelvinAttributes.DTYPE] = _.get(query_response, "data.entity_data.value");

            } else if (query_response['data']['entity_type'] === OOVEntityTypes.DSOURCE) {
                new_melvin_state[MelvinAttributes.DSOURCE] = _.get(query_response, "data.entity_data.value");
            }

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
};

const update_melvin_history = async function (handlerInput) {
    const timestamp = moment().valueOf();
    const utterance_id = `${handlerInput.requestEnvelope.session.sessionId}_${timestamp}`;
    const melvin_state = get_melvin_state(handlerInput);

    // store utterance as a session attribute for faster navigation
    let melvin_history = get_melvin_history(handlerInput);
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    const event_type = get_event_type(handlerInput);

    let intent_name = "UNKNOWN_INTENT";
    if (_.has(handlerInput, "requestEnvelope.request.intent.name")) {
        intent_name = handlerInput.requestEnvelope.request.intent.name;
    }

    const history_event = {
        melvin_state: melvin_state,
        intent: intent_name,
        event_type: event_type
    };
    melvin_history.unshift(history_event);
    if (melvin_history.length > MELVIN_MAX_HISTORY_ITEMS) {
        melvin_history = melvin_history.pop()
    }
    sessionAttributes['MELVIN.HISTORY'] = melvin_history;
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

    const new_utterance_rec = {
        'user_id': handlerInput.requestEnvelope.session.user.userId,
        'utterance_id': utterance_id,
        'createdAt': timestamp,
        'request': handlerInput.requestEnvelope.request,
        'device': handlerInput.requestEnvelope.context.System.device,
        'melvin_state': melvin_state,
        'melvin_history': melvin_history
    };
    await utterances_doc.addUserUtterance(new_utterance_rec);
};


function validate_required_attributes(melvin_state) {
    console.log(`[validate_required_attributes] | melvin_state: ${JSON.stringify(melvin_state)}`);
    if (_.isEmpty(melvin_state['data_type'])) {
        return;
    }

    const attr_key = melvin_state['data_type'];
    if (!(melvin_state['data_type'] in DataTypes)) {
        let error = new Error('Error while validating data_type in melvin_state', melvin_state);
        error.type = MelvinIntentErrors.INVALID_DATA_TYPE;
        error.speech = "I could not understand that data type. Please try again.";
        throw error;
    }

    let req_attr_dict = RequiredAttributesTCGA;
    if (_.has(melvin_state, 'data_source') && melvin_state['data_source'] === DataSources.CLINVAR) {
        req_attr_dict = RequiredAttributesClinvar;
    }

    if (!_.has(req_attr_dict, attr_key) || !_.isArray(req_attr_dict[attr_key])) {
        let error = new Error('Error while retrieving required attributes in melvin_state', melvin_state);
        error.type = MelvinIntentErrors.INVALID_STATE;
        error.speech = `This data type is not supported in ${melvin_state['data_source']}.`;
        throw error;
    }

    const required_attributes = req_attr_dict[attr_key];
    const has_gene = !_.isEmpty(melvin_state[MelvinAttributes.GENE_NAME]);
    const has_study = !_.isEmpty(melvin_state[MelvinAttributes.STUDY_ABBRV]);

    let code = 0;
    if (has_gene) {
        code += 2;
    }
    if (has_study) {
        code += 1;
    }
    const is_valid = required_attributes.includes(code);

    if (!is_valid && !has_gene) {
        let error = new Error('Error while validating required attributes in melvin_state', melvin_state);
        error.type = MelvinIntentErrors.MISSING_GENE;
        error.speech = "I need to know a gene name first. What gene are you interested in?";
        throw error;
    }

    if (!is_valid && !has_study) {
        let error = new Error('Error while validating required attributes in melvin_state', melvin_state);
        error.type = MelvinIntentErrors.MISSING_STUDY;
        error.speech = "I need to know a cancer type first. What cancer type are you interested in?";
        throw error;
    }
};

const validate_navigation_intent_state = function (handlerInput, state_change) {
    console.log(`[validate_navigation_intent_state] | state_change: ${JSON.stringify(state_change)}`);
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    if (_.isEmpty(state_change['oov_data']['entity_data'])) {
        let error = new Error('Error while validating oov_data in state_change', state_change);
        error.type = MelvinIntentErrors.MISSING_GENE;
        error.speech = "Sorry, I did not understand that query.";
        throw error;
    }

    // Merge the previous state and new state. Overwrite with the latest.
    const melvin_state = { ...state_change['prev_melvin_state'], ...state_change['new_melvin_state'] };

    sessionAttributes['MELVIN.STATE'] = melvin_state;
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
    validate_required_attributes(melvin_state);
    return melvin_state;
};

const validate_action_intent_state = function (handlerInput, state_change, intent_data_type) {
    console.log(`[validate_action_intent_state] | state_change: ${JSON.stringify(state_change)}`);
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    // if (state_change['oov_data']['entity_type'] === OOVEntityTypes.DTYPE) {
    //     let error = new Error('Error while validating action intent state', state_change);
    //     error.type = MelvinIntentErrors.INVALID_ENTITY_TYPE;
    //     error.speech = "Your query is invalid. A data type cannot be used in an action intent";
    //     throw error;
    // }

    // merge the previous state and new state. Overwrite with the latest
    const melvin_state = { ...state_change['prev_melvin_state'], ...state_change['new_melvin_state'] };
    melvin_state['data_type'] = intent_data_type;
    sessionAttributes['MELVIN.STATE'] = melvin_state;
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
    validate_required_attributes(melvin_state);
    return melvin_state;
};

function add_followup_text(handlerInput, speech) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    melvin_state = sessionAttributes['MELVIN.STATE'];
    if (Object.keys(melvin_state).length <= FOLLOW_UP_TEXT_THRESHOLD) {
        speech.prosody({ rate: '110%' }, 'What would you like to know?');
    }
}

const ack_attribute_change = function (handlerInput, oov_data) {
    const speech = new Speech();

    if (oov_data['entity_type'] === OOVEntityTypes.GENE) {
        const gene_name = oov_data['entity_data']['value'];
        const gene_speech_text = get_gene_speech_text(gene_name);
        speech.sayWithSSML(`Ok, ${gene_speech_text}.`);
        add_followup_text(handlerInput, speech);
        handlerInput.responseBuilder.withSimpleCard(MELVIN_APP_NAME, gene_name);

    } else if (oov_data['entity_type'] === OOVEntityTypes.STUDY) {
        const study_name = oov_data['entity_data']['study_name'];
        speech.say(`Ok, ${study_name}.`);
        add_followup_text(handlerInput, speech);
        handlerInput.responseBuilder.withSimpleCard(MELVIN_APP_NAME, `${study_name}`);

    } else if (oov_data['entity_type'] === OOVEntityTypes.DSOURCE) {
        const dsource = oov_data['entity_data']['value'];
        speech.say(`Ok, switching to ${dsource}.`);
        handlerInput.responseBuilder.withSimpleCard(MELVIN_APP_NAME, `${dsource}`);
    }

    return {
        'speech_text': speech.ssml()
    };
}

const build_navigation_response = async function (handlerInput, melvin_state, state_change = []) {
    let response = {};
    if (_.isEmpty(melvin_state[MelvinAttributes.DTYPE])) {
        if (_.has(state_change, 'oov_data')) {
            response = ack_attribute_change(handlerInput, state_change['oov_data']);
        } else {
            let card_text_list = [];
            for (let key in melvin_state) {
                card_text_list.push(`${key}: ${melvin_state[key]}`);
            }
            handlerInput.responseBuilder.withSimpleCard(MELVIN_APP_NAME, card_text_list.join(" | "));
            response = {
                'speech_text': "Ok. navigation complete"
            }
        }

    } else {
        if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.OVERVIEW) {
            response = await build_overview_response(handlerInput, melvin_state);

        } else if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.GENE_DEFINITION) {
            response = await build_gene_definition_response(melvin_state);

        } else if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.MUTATIONS) {
            response = await build_mutations_response(handlerInput, melvin_state);

        } else if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.MUTATION_DOMAINS) {
            response = await build_mutations_domain_response(handlerInput, melvin_state);

        } else if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.CNV_AMPLIFICATIONS) {
            const params = {
                ...melvin_state,
                cnv_change: CNVTypes.APLIFICATIONS
            };
            response = await build_navigate_cnv_response(handlerInput, params);

        } else if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.CNV_DELETIONS) {
            const params = {
                ...melvin_state,
                cnv_change: CNVTypes.DELETIONS
            };
            response = await build_navigate_cnv_response(handlerInput, params);

        } else if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.CNV_ALTERATIONS) {
            const params = {
                ...melvin_state,
                cnv_change: CNVTypes.ALTERATIONS
            };
            response = await build_navigate_cnv_response(handlerInput, params);

        } else if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.STRUCTURAL_VARIANTS) {
            response = await build_sv_response(handlerInput, melvin_state);

        } else {
            throw melvin_error(`Unknown data_type found in melvin_state: ${JSON.stringify(melvin_state)}`,
                MelvinIntentErrors.INVALID_DATA_TYPE);
        }
    }

    console.log(`[build_navigation_response] response = ${JSON.stringify(response)}`);
    return response;
}

module.exports = {
    NAVIGATION_TOPICS,
    get_melvin_state,
    get_melvin_history,
    update_melvin_state,
    update_melvin_history,
    validate_navigation_intent_state,
    validate_action_intent_state,
    build_navigation_response,
    ack_attribute_change
}