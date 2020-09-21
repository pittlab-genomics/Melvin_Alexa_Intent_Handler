const _ = require("lodash",);
const yaml = require("js-yaml",);
const moment = require("moment",);

const utterances_doc = require("../dao/utterances.js",);
const { get_oov_mapping_by_query, } = require("../http_clients/oov_mapper_client.js",);
const {
    MELVIN_MAX_HISTORY_ITEMS,
    MelvinAttributes,
    MelvinEventTypes,
    MelvinIntentErrors,
    OOVEntityTypes,
    RequiredAttributesTCGA,
    RequiredAttributesClinvar,
    DataTypes,
    DataSources,
    melvin_error
} = require("../common.js",);

const { get_event_type } = require("./handler_configuration.js",);

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
    validate_action_intent_state
};

