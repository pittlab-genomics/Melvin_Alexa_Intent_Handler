const _ = require("lodash");
const yaml = require("js-yaml");
const moment = require("moment");
const { performance } = require("perf_hooks");

const utterances_doc = require("../dao/utterances.js");
const voicerecords_doc = require("../dao/voicerecords.js");
const { get_oov_mapping_by_query, } = require("../http_clients/oov_mapper_client.js");
const {
    MELVIN_MAX_HISTORY_ITEMS,
    DEFAULT_OOV_MAPPING_ERROR_RESPONSE,
    DEFAULT_INVALID_STATE_RESPONSE,
    SPLITBY_ERROR_INCOMPLETE_STATE,
    SPLITBY_ELICIT_GENE,
    SPLITBY_ELICIT_DTYPE,
    SUPPORTED_SPLITBY_DTYPES,
    MelvinAttributes,
    MelvinEventTypes,
    MelvinIntentErrors,
    OOVEntityTypes,
    RequiredAttributesTCGA,
    RequiredAttributesClinvar,
    DataTypes,
    DataSources,
    melvin_error,
    get_whitelisted_oov_mapping
} = require("../common.js");

const { build_melvin_voice_response } = require("../utils/response_builder_utils.js");
const { get_event_type } = require("./handler_configuration.js");
const NAVIGATION_TOPICS = yaml.load("../../resources/navigation/topics.yml");

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
    const melvin_state = get_melvin_state(handlerInput);
    let prev_melvin_state = {};
    for (let item in melvin_history) {
        let prev_item = melvin_history[item];
        if (!_.isEqual(prev_item["melvin_state"], melvin_state)) {
            prev_melvin_state = prev_item["melvin_state"];
            break;
        }
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


const resolve_oov_entity = async function (handlerInput, query) {
    const t0 = performance.now();
    const preferences = await handlerInput.attributesManager.getPersistentAttributes(true, {});
    const mapping_preference = _.has(preferences, "CUSTOM_MAPPINGS") ? preferences["CUSTOM_MAPPINGS"] : false;
    if (mapping_preference) {
        console.info("[resolve_oov_entity] Looking up custom mappings...");
        let result = await voicerecords_doc.getOOVMappingForQuery(query);
        if (result != null) {
            console.debug(`[resolve_oov_entity] response: ${JSON.stringify(result)}`);
            return { "data": result[0]["entity_data"] };
        }
    }
    const request_id = _.get(handlerInput, "requestEnvelope.request.requestId");
    const session_id = _.get(handlerInput, "requestEnvelope.session.sessionId");
    let result = get_whitelisted_oov_mapping(query);
    if (!result) {
        try {
            const params = {
                query, request_id, session_id,
            };
            result = await get_oov_mapping_by_query(handlerInput, params);
        } catch (error) {
            const t2 = performance.now();
            console.error("[resolve_oov_entity] OOV request failed and took " + (t2 - t0) + " ms", error);
            throw melvin_error(`Error while mapping query: ${query}`,
                MelvinIntentErrors.OOV_ERROR,
                DEFAULT_OOV_MAPPING_ERROR_RESPONSE);
        }
    }
    const t1 = performance.now();
    const reqAttributes = handlerInput.attributesManager.getRequestAttributes();
    reqAttributes["OOV_COMPLETED_TS"] = t1;
    handlerInput.attributesManager.setRequestAttributes(reqAttributes);
    console.info(`[resolve_oov_entity] OOV query resolution took ${t1 - t0} | result: ${JSON.stringify(result)}`);
    return result;
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
        if (query_response.data.type === OOVEntityTypes.GENE) {
            oov_entity[MelvinAttributes.GENE_NAME] = _.get(query_response, "data.val");
        } else if (query_response.data.type === OOVEntityTypes.STUDY) {
            oov_entity[MelvinAttributes.STUDY_ABBRV] = _.get(query_response, "data.val");
        } else if (query_response.data.type === OOVEntityTypes.DTYPE) {
            const curr_datatype = _.get(query_response, "data.val");
            if (curr_datatype === DataTypes.PROTEIN_DOMAINS) {
                const prev_datatype = prev_state[MelvinAttributes.DTYPE];
                if (prev_datatype === DataTypes.MUTATIONS) oov_entity[MelvinAttributes.DTYPE] = DataTypes.MUT_DOMAINS;
                else if (prev_datatype === DataTypes.INDELS) oov_entity[MelvinAttributes.DTYPE] = DataTypes.IND_DOMAINS;
                else if (prev_datatype === DataTypes.SNV) oov_entity[MelvinAttributes.DTYPE] = DataTypes.SNV_DOMAINS;
                else oov_entity[MelvinAttributes.DTYPE] = DataTypes.PROTEIN_DOMAINS;
            }
            else oov_entity[MelvinAttributes.DTYPE] = curr_datatype;
        } else if (query_response.data.type === OOVEntityTypes.DSOURCE) {
            oov_entity[MelvinAttributes.DSOURCE] = _.get(query_response, "data.val");
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
    const utterance_id = `${handlerInput.requestEnvelope.session.sessionId}_${timestamp}`;
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
        melvin_history = new Array(melvin_history.pop());
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

const validate_required_attributes = function (melvin_state) {
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
};

const validate_required_datatypes = function (state_change) {
    const melvin_state = state_change["updated_state"];
    console.log(`[validate_required_datatypes] melvin_state: ${JSON.stringify(melvin_state)}`);

    const data_type_val = melvin_state[MelvinAttributes.DTYPE];

    if (data_type_val === DataTypes.PROTEIN_DOMAINS) {
        throw melvin_error(
            "[validate_required_attributes] error while validating required datatype | " +
            `data_type_val: ${data_type_val}, melvin_state: ${JSON.stringify(melvin_state)}`,
            MelvinIntentErrors.INVALID_DATA_TYPE,
            "Domains are supported only when the previous data type is mutations, SNVs, or indels."
        );
    }
};

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

const clean_melvin_state = function (handlerInput, session_path = "MELVIN.STATE") {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    sessionAttributes[session_path] = {};
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
};

const clean_melvin_aux_state = function (handlerInput, session_path = "MELVIN.AUX.STATE") {
    clean_melvin_state(handlerInput, session_path);
};


const resolve_splitby_query = async function (handlerInput) {
    const splitby_queries = {
        "splitby_query": _.get(handlerInput, "requestEnvelope.request.intent.slots.query.value"),
        "dtype_query":   _.get(handlerInput, "requestEnvelope.request.intent.slots.dtype_query.value"),
        "gene_query":    _.get(handlerInput, "requestEnvelope.request.intent.slots.gene_query.value")
    };

    const oov_entity = {};
    for (const [key, query] of Object.entries(splitby_queries)) {
        if (!_.isEmpty(query)) {
            let query_response = await resolve_oov_entity(handlerInput, query);
            if (query_response.data.type === OOVEntityTypes.DTYPE &&
                (key === "splitby_query" || key === "dtype_query")) {
                oov_entity[MelvinAttributes.DTYPE] = _.get(query_response, "data.val");
            }

            if (query_response.data.type === OOVEntityTypes.GENE &&
                (key === "splitby_query" || key === "gene_query")) {
                oov_entity[MelvinAttributes.GENE_NAME] = _.get(query_response, "data.val");
            }
        }
    }

    // update and store melvin_aux_state with slot values provided in this turn
    let melvin_aux_state = get_melvin_aux_state(handlerInput);
    melvin_aux_state = {
        ...melvin_aux_state, ...oov_entity
    };
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    sessionAttributes["MELVIN.AUX.STATE"] = melvin_aux_state;
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
    console.info(`[resolve_splitby_query] updated melvin_aux_state: ${JSON.stringify(melvin_aux_state)}`);

    return melvin_aux_state;
};

const validate_splitby_melvin_state = function (melvin_state) {
    if (_.isEmpty(melvin_state[MelvinAttributes.STUDY_ABBRV]) ||
        _.isEmpty(melvin_state[MelvinAttributes.GENE_NAME]) ||
        _.isEmpty(melvin_state[MelvinAttributes.DTYPE])) {
        throw melvin_error(
            "[validate_splitby_melvin_state] empty/incomplete melvin state " +
            `| melvin_state: ${JSON.stringify(melvin_state)}`,
            MelvinIntentErrors.MISSING_STUDY,
            SPLITBY_ERROR_INCOMPLETE_STATE
        );
    }
};

const elicit_splitby_slots = async function (handlerInput, melvin_aux_state) {
    console.log(`[elicit_splitby_slots] melvin_aux_state: ${JSON.stringify(melvin_aux_state)}`);
    const response = handlerInput.responseBuilder.withShouldEndSession(false);
    if (_.isEmpty(melvin_aux_state[MelvinAttributes.DTYPE])) {
        const elicit_text = build_melvin_voice_response(SPLITBY_ELICIT_DTYPE);
        return response
            .speak(elicit_text)
            .reprompt(elicit_text)
            .addElicitSlotDirective("dtype_query")
            .getResponse();

    } else if (_.isEmpty(melvin_aux_state[MelvinAttributes.GENE_NAME])) {
        const elicit_text = build_melvin_voice_response(SPLITBY_ELICIT_GENE);
        return response
            .speak(elicit_text)
            .reprompt(elicit_text)
            .addElicitSlotDirective("gene_query")
            .getResponse();

    } else {
        throw melvin_error(
            `[elicit_splitby_slots] invalid state | melvin_aux_state: ${JSON.stringify(melvin_aux_state)}`,
            MelvinIntentErrors.INVALID_STATE,
            DEFAULT_INVALID_STATE_RESPONSE
        );
    }
};

const is_splitby_supported = function (query_dtypes) {
    for (var index = 0; index < SUPPORTED_SPLITBY_DTYPES.length; index++) {
        if ((query_dtypes[0] === SUPPORTED_SPLITBY_DTYPES[index][0]
            && query_dtypes[1] === SUPPORTED_SPLITBY_DTYPES[index][1])
            || (query_dtypes[0] === SUPPORTED_SPLITBY_DTYPES[index][1]
                && query_dtypes[1] === SUPPORTED_SPLITBY_DTYPES[index][0])
        ) {
            return true;
        }
    }

    console.log(`[is_splitby_supported] splitby not supported for query_dtypes: ${JSON.stringify(query_dtypes)}`);
    return false;
};

const match_compare_dtype = function (query_dtypes, target_dtypes) {
    if ((query_dtypes[0] === target_dtypes[0] && query_dtypes[1] === target_dtypes[1])
        || (query_dtypes[0] === target_dtypes[1] && query_dtypes[1] === target_dtypes[0])
    ) {
        return true;
    }
    return false;
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
    validate_required_datatypes,
    validate_action_intent_state,
    clean_melvin_state,
    clean_melvin_aux_state,
    resolve_splitby_query,
    is_splitby_supported,
    elicit_splitby_slots,
    validate_splitby_melvin_state,
    match_compare_dtype
};

