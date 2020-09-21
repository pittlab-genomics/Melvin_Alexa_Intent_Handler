const Speech = require("ssml-builder",);
const _ = require("lodash",);
const yaml = require("js-yaml",);
const moment = require("moment",);

const { get_state_change_diff, } = require("../utils/response_builder_utils.js",);
const utterances_doc = require("../dao/utterances.js",);
const { get_oov_mapping_by_query, } = require("../http_clients/oov_mapper_client.js",);
const {
    MELVIN_MAX_HISTORY_ITEMS,
    FOLLOW_UP_TEXT_THRESHOLD,
    MelvinAttributes,
    MelvinEventTypes,
    MelvinIntentErrors,
    OOVEntityTypes,
    RequiredAttributesTCGA,
    RequiredAttributesClinvar,
    DataTypes,
    DataSources,
    melvin_error,
    get_gene_speech_text,
    get_study_name_text,
    get_dtype_name_text,
    MELVIN_APP_NAME,
} = require("../common.js",);

const { get_event_type, } = require("./handler_configuration.js",);
const {
    build_navigate_cna_response, build_cna_compare_response, 
} = require("../cna/response_builder.js",);
const { build_gene_definition_response, } = require("../gene/gene_definition_response_builder.js",);
const { build_sv_response, } = require("../structural_variants/sv_helper.js",);
const { build_overview_response, } = require("../overview/overview_helper.js",);
const { build_gene_expression_response, } = require("../gene_expression/response_builder.js",);
const { build_mut_cna_compare_response, } = require("../comparison/mut_cna_response_builder.js",);
const {
    build_mutations_response,
    build_mutations_domain_response,
    build_mutations_compare_response,
} = require("../mutations/response_builder.js",);

const NAVIGATION_TOPICS = yaml.load("../../resources/navigation/topics.yml",);

const get_melvin_state = function (handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    let melvin_state = {};
    if (sessionAttributes["MELVIN.STATE"]) {
        melvin_state = sessionAttributes["MELVIN.STATE"];
    }
    if (!_.has(melvin_state, MelvinAttributes.DSOURCE)) {
        // default to TCGA data source
        melvin_state[MelvinAttributes.DSOURCE] = DataSources.TCGA;
    }
    return melvin_state;
};

const get_melvin_aux_state = function (handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    let melvin_aux_state = {};
    if (sessionAttributes["MELVIN.AUX.STATE"]) {
        melvin_aux_state = sessionAttributes["MELVIN.AUX.STATE"];
    }
    if (!_.has(melvin_aux_state, MelvinAttributes.DSOURCE)) {
        // default to TCGA data source
        melvin_aux_state[MelvinAttributes.DSOURCE] = DataSources.TCGA;
    }
    return melvin_aux_state;
};

const get_prev_melvin_state = function (handlerInput) {
    const melvin_history = get_melvin_history(handlerInput);
    let prev_melvin_state = {};
    if (melvin_history.length > 0) {
        prev_melvin_state = melvin_history.melvin_state;
    }
    return prev_melvin_state;
};

const get_melvin_history = function (handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    let melvin_history = [];
    if (sessionAttributes["MELVIN.HISTORY"]) {
        melvin_history = sessionAttributes["MELVIN.HISTORY"];
    }
    return melvin_history;
};


const resolve_oov_entity = async function(handlerInput, query) {
    const request_id = _.get(handlerInput, "requestEnvelope.request.requestId");
    const session_id = _.get(handlerInput, "requestEnvelope.session.sessionId");
    try {
        const params = {
            query, request_id, session_id, 
        };
        const query_response = await get_oov_mapping_by_query(params);
        console.log(`[resolve_oov_entity] query_response: ${JSON.stringify(query_response)}`);
        return query_response;
    } catch (error) {
        console.error(`[resolve_oov_entity] message: ${error.message}`, error);
        throw melvin_error(`Error while mapping query: ${query}`,
            MelvinIntentErrors.OOV_ERROR,
            "Sorry, something went wrong while resolving the query utterance. Please try again later.");
    }
};

const update_melvin_state = async function (
    handlerInput,
    query_path = "requestEnvelope.request.intent.slots.query.value",
    session_path = "MELVIN.STATE",
) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    let prev_state = {};
    if (_.has(sessionAttributes, session_path)) {
        prev_state = sessionAttributes[session_path];
    }
    if (!_.has(prev_state, MelvinAttributes.DSOURCE)) {
        // default to TCGA data source
        prev_state[MelvinAttributes.DSOURCE] = DataSources.TCGA;
    }

    const oov_entity = {};
    let updated_state = {};
    const query = _.get(handlerInput, query_path);
    if (!_.isEmpty(query)) { // empty query is valid for direct intent invocations
        // resolve out-of-vocabulary entity using OOV Mapper API
        const query_response = await resolve_oov_entity(handlerInput, query);
        if (query_response.data.entity_type === OOVEntityTypes.GENE) {
            oov_entity[MelvinAttributes.GENE_NAME] = _.get(query_response, "data.entity_data.value");
        } else if (query_response.data.entity_type === OOVEntityTypes.STUDY) {
            oov_entity[MelvinAttributes.STUDY_ABBRV] = _.get(query_response, "data.entity_data.value");
        } else if (query_response.data.entity_type === OOVEntityTypes.DTYPE) {
            oov_entity[MelvinAttributes.DTYPE] = _.get(query_response, "data.entity_data.value");
        } else if (query_response.data.entity_type === OOVEntityTypes.DSOURCE) {
            oov_entity[MelvinAttributes.DSOURCE] = _.get(query_response, "data.entity_data.value");
        }
        console.log(`[update_melvin_state] session_path: ${JSON.stringify(session_path)}, `
            + `query_path: ${query_path}, prev_state: ${JSON.stringify(prev_state)}, `
            + `oov_entity: ${JSON.stringify(oov_entity)}`);

        // Merge the previous state and new state. Overwrite with the latest.
        updated_state = {
            ...prev_state, ...oov_entity, 
        };
        sessionAttributes[session_path] = updated_state;
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
    }

    return {
        oov_entity,
        prev_state,        
        updated_state,
    };
};

const update_melvin_aux_state = async function (
    handlerInput,
    query_path = "requestEnvelope.request.intent.slots.query.value",
    session_path = "MELVIN.AUX.STATE",
) {
    return update_melvin_state(handlerInput, query_path, session_path);
};

const update_melvin_history = async function (handlerInput) {
    const event_type = get_event_type(handlerInput);
    if (event_type === MelvinEventTypes.LAUNCH_EVENT || event_type === MelvinEventTypes.SESSION_ENDED_EVENT) {
        return; // skip launch events and session ended event since they don't have new information
    }

    const timestamp = moment().valueOf();
    const utterance_id = `${timestamp}_${handlerInput.requestEnvelope.session.sessionId}`;
    const melvin_state = get_melvin_state(handlerInput);

    // store utterance as a session attribute for faster navigation
    let melvin_history = get_melvin_history(handlerInput);
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    const intent_name = _.get(handlerInput, "requestEnvelope.request.intent.name", "UNKNOWN_INTENT");
    const history_event = {
        melvin_state,
        intent: intent_name,
        event_type,
    };
    melvin_history.unshift(history_event);
    if (melvin_history.length > MELVIN_MAX_HISTORY_ITEMS) {
        melvin_history = melvin_history.pop();
    }
    sessionAttributes["MELVIN.HISTORY"] = melvin_history;
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

    const melvin_response = handlerInput.responseBuilder.getResponse();
    const new_utterance_rec = {
        user_id:   handlerInput.requestEnvelope.session.user.userId,
        utterance_id,
        createdAt: timestamp,
        request:   handlerInput.requestEnvelope.request,
        device:    handlerInput.requestEnvelope.context.System.device,
        melvin_state,
        intent:    intent_name,
        event_type,
        melvin_history,
        melvin_response,
    };
    await utterances_doc.addUserUtterance(new_utterance_rec);
};

function validate_required_attributes(melvin_state) {
    console.log(`[validate_required_attributes] melvin_state: ${JSON.stringify(melvin_state)}`);
    if (_.isEmpty(melvin_state[MelvinAttributes.DTYPE])) {
        return;
    }

    const data_type_val = melvin_state[MelvinAttributes.DTYPE];
    if (!(data_type_val in DataTypes)) {
        throw melvin_error(
            "[validate_required_attributes] error while validating required attributes | " +
                `data_type_val: ${data_type_val}, melvin_state: ${JSON.stringify(melvin_state)}`,
            MelvinIntentErrors.INVALID_DATA_TYPE,
            "I could not understand that data type. Please try again."
        );
    }

    let req_attr_dict = RequiredAttributesTCGA;
    if (_.has(melvin_state, MelvinAttributes.DSOURCE) 
        && melvin_state[MelvinAttributes.DSOURCE] === DataSources.CLINVAR) {
        req_attr_dict = RequiredAttributesClinvar;
    }

    if (!_.has(req_attr_dict, data_type_val) || !_.isArray(req_attr_dict[data_type_val])) {
        throw melvin_error(
            "Error while validating required attributes | " +
                `req_attr_dict: ${JSON.stringify(req_attr_dict)}, melvin_state: ${JSON.stringify(melvin_state)}`,
            MelvinIntentErrors.INVALID_DATA_TYPE,
            `This data type is not supported in ${melvin_state[MelvinAttributes.DSOURCE]}.`
        );
    }

    const required_attributes = req_attr_dict[data_type_val];
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
    console.debug(`[validate_required_attributes] required_attributes: ${JSON.stringify(required_attributes)}, `
        + `code: ${JSON.stringify(code)}`);

    if (!is_valid && !has_gene) {
        throw melvin_error(
            "Error while validating required attributes in melvin_state | " +
                `melvin_state: ${JSON.stringify(melvin_state)}`,
            MelvinIntentErrors.MISSING_GENE,
            "I need to know a gene name first. What gene are you interested in?"
        );
    }

    if (!is_valid && !has_study) {
        throw melvin_error(
            "Error while validating required attributes in melvin_state | " +
                `melvin_state: ${JSON.stringify(melvin_state)}`,
            MelvinIntentErrors.MISSING_STUDY,
            "I need to know a cancer type first. What cancer type are you interested in?"
        );
    }
}

const validate_navigation_intent_state = function (handlerInput, state_change) {
    console.log(`[validate_navigation_intent_state] | state_change: ${JSON.stringify(state_change)}`);
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    // Merge the previous state and new state. Overwrite with the latest.
    const melvin_state = {
        ...state_change["prev_state"], ...state_change["updated_state"] 
    };

    sessionAttributes["MELVIN.STATE"] = melvin_state;
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
    validate_required_attributes(melvin_state);
    return melvin_state;
};

const validate_action_intent_state = function (handlerInput, state_change, intent_data_type) {
    console.log(`[validate_action_intent_state] state_change: ${JSON.stringify(state_change)}`);
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    // merge the previous state and new state. Overwrite with the latest
    const melvin_state = {
        ...state_change["prev_state"], ...state_change["updated_state"] 
    };
    melvin_state["data_type"] = intent_data_type;
    sessionAttributes["MELVIN.STATE"] = melvin_state;
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
    validate_required_attributes(melvin_state);
    return melvin_state;
};

function add_followup_text(handlerInput, speech) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    if (Object.keys(sessionAttributes["MELVIN.STATE"]).length <= FOLLOW_UP_TEXT_THRESHOLD) {
        speech.prosody({ rate: "110%" }, "What would you like to know?");
    }
}

const ack_attribute_change = function (handlerInput, state_change) {
    const speech = new Speech();
    const state_diff = get_state_change_diff(state_change);

    if (state_diff["entity_type"] === MelvinAttributes.GENE_NAME) {
        const gene_name = state_diff["entity_value"];
        const gene_speech_text = get_gene_speech_text(gene_name);
        speech.sayWithSSML(`Ok, ${gene_speech_text}.`);
        add_followup_text(handlerInput, speech);

    } else if (state_diff["entity_type"] === MelvinAttributes.STUDY_ABBRV) {
        const study_abbrv = state_diff["entity_value"];
        const study_name = get_study_name_text(study_abbrv);
        speech.say(`Ok, ${study_name}.`);
        add_followup_text(handlerInput, speech);

    } else if (state_diff["entity_type"] === MelvinAttributes.DSOURCE) {
        const dsource = state_diff["entity_value"];
        speech.say(`Ok, switching to ${dsource}.`);

    } else if (state_diff["entity_type"] === MelvinAttributes.DTYPE) {
        const dtype = state_diff["entity_value"];
        const dtype_name = get_dtype_name_text(dtype);
        speech.say(`Ok, ${dtype_name}.`);
        add_followup_text(handlerInput, speech);
    }

    return { "speech_text": speech.ssml() };
};

const build_compare_response = async function (handlerInput, melvin_state, compare_state, state_diff) {
    let response = {};
    console.log(`[build_compare_response] melvin_state: ${JSON.stringify(melvin_state)}, `
        + `compare_state: ${JSON.stringify(compare_state)}, state_diff: ${JSON.stringify(state_diff)}`);

    if (state_diff["entity_type"] === MelvinAttributes.DTYPE) {
        if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.MUTATIONS
            || melvin_state[MelvinAttributes.DTYPE] === DataTypes.CNA) {
            response = await build_mut_cna_compare_response(handlerInput, melvin_state, state_diff);

        } else {
            throw melvin_error(
                `[build_compare_response] not implemented | melvin_state: ${JSON.stringify(melvin_state)}`,
                MelvinIntentErrors.NOT_IMPLEMENTED,
                "This data type comparison analysis is not yet supported"
            );
        }


    } else if (state_diff["entity_type"] === MelvinAttributes.DSOURCE) {
        throw melvin_error(
            `[build_compare_response] not implemented | melvin_state: ${JSON.stringify(melvin_state)}`,
            MelvinIntentErrors.NOT_IMPLEMENTED,
            "comparisons across data sources are not yet supported"
        );

    } else {
        if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.MUTATIONS) {
            response = await build_mutations_compare_response(handlerInput, melvin_state, compare_state, state_diff);

        } else if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.PROTEIN_DOMAINS) {
            response = await build_mutations_domain_response(handlerInput, melvin_state);

        } else if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.GAIN) {
            response = await build_cna_compare_response(handlerInput, melvin_state, compare_state, state_diff);

        } else if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.LOSS) {
            response = await build_cna_compare_response(handlerInput, melvin_state, compare_state, state_diff);

        } else if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.CNA) {
            response = await build_cna_compare_response(handlerInput, melvin_state, compare_state, state_diff);

        } else {
            throw melvin_error(
                `Error while building compare reponse: melvin_state: ${melvin_state}, ` + 
                    `compare_state: ${compare_state}`,
                MelvinIntentErrors.INVALID_STATE,
                "The data type is missing for comparison."
            );
        }
    }


    console.log(`[build_compare_response] response = ${JSON.stringify(response)}`);
    return response;
};

const build_navigation_response = async function (handlerInput, state_change) {
    const melvin_state = get_melvin_state(handlerInput);
    const attr_count = Object.keys(melvin_state).length;
    console.log(`[build_navigation_response] state_change: ${JSON.stringify(state_change)}, ` +
        `attr_count: ${attr_count}`);

    let response = "";
    if (attr_count <= FOLLOW_UP_TEXT_THRESHOLD || _.isEmpty(melvin_state[MelvinAttributes.DTYPE])) {
        response = ack_attribute_change(handlerInput, state_change);
        let card_text_list = [];
        for (let key in melvin_state) {
            card_text_list.push(`${key}: ${melvin_state[key]}`);
        }
        handlerInput.responseBuilder.withSimpleCard(MELVIN_APP_NAME, card_text_list.join("\n"));

    } else {
        if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.OVERVIEW) {
            response = await build_overview_response(handlerInput, melvin_state);

        } else if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.GENE_DEFINITION) {
            response = await build_gene_definition_response(melvin_state);

        } else if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.MUTATIONS) {
            response = await build_mutations_response(handlerInput, melvin_state);

        } else if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.PROTEIN_DOMAINS) {
            response = await build_mutations_domain_response(handlerInput, melvin_state);

        } else if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.GAIN) {
            response = await build_navigate_cna_response(handlerInput, melvin_state);

        } else if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.LOSS) {
            response = await build_navigate_cna_response(handlerInput, melvin_state);

        } else if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.CNA) {
            response = await build_navigate_cna_response(handlerInput, melvin_state);

        } else if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.STRUCTURAL_VARIANTS) {
            response = await build_sv_response(handlerInput, melvin_state);
 
        } else if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.GENE_EXPRESSION) {
            response = await build_gene_expression_response(handlerInput, melvin_state);

        } else {
            throw melvin_error(`Unknown data_type found in melvin_state: ${JSON.stringify(melvin_state)}`,
                MelvinIntentErrors.INVALID_DATA_TYPE);
        }
    }
    return response;
};

module.exports = {
    NAVIGATION_TOPICS,
    get_melvin_state,
    get_melvin_aux_state,
    get_prev_melvin_state,
    get_melvin_history,
    update_melvin_state,
    update_melvin_aux_state,
    update_melvin_history,
    resolve_oov_entity,
    validate_navigation_intent_state,
    validate_action_intent_state,
    build_navigation_response,
    build_compare_response,
    ack_attribute_change
};

