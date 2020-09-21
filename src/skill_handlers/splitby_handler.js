const _ = require("lodash");

const {
    DEFAULT_GENERIC_ERROR_SPEECH_TEXT,
    MelvinAttributes,
    SUPPORTED_SPLITBY_DTYPES,
    OOVEntityTypes,
    MelvinIntentErrors,
    melvin_error,
    DEFAULT_INVALID_STATE_RESPONSE
} = require("../common.js");

const {
    get_melvin_state,
    get_melvin_aux_state,
    resolve_oov_entity
} = require("../utils/navigation_utils.js");

const { build_splitby_response } = require("../splitby/response_builder.js");

const NavigateSplitbyIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "NavigateSplitbyIntent";
    },
    async handle(handlerInput) {
        let speechText = "";
        try {
            // validate melvin_state for required attributes
            const melvin_state = get_melvin_state(handlerInput);
            validate_splitby_melvin_state(melvin_state);

            // cleanup splitby state whenever a new dialog flow is initiated
            if (_.get(handlerInput, "requestEnvelope.request.dialogState") === "STARTED") {
                clean_splitby_aux_state(handlerInput);
            }

            // resolve slot values provided in this turn
            const melvin_aux_state = await resolve_splitby_query(handlerInput);

            // check whether melvin_aux state contains required attributes, if not then elicit 
            // those via Alexa dialog management flow
            if (_.isEmpty(melvin_aux_state[MelvinAttributes.DTYPE])
                || _.isEmpty(melvin_aux_state[MelvinAttributes.GENE_NAME])) {
                return elicit_splitby_slots(handlerInput, melvin_aux_state);
            }
            
            // split-by state should have the same cancer type and data source as melvin_state
            const splitby_state = {
                ...melvin_state, ...melvin_aux_state
            };

            // check whether requested split-by analysis is supported
            validate_splitby_aux_state(melvin_state, splitby_state);

            // generate the response for the requested split-by analysis
            let response = await build_splitby_response(handlerInput, melvin_state, splitby_state);
            speechText = response["speech_text"];

            // cleanup splitby state after dialog management flow is complete
            clean_splitby_aux_state(handlerInput);
        } catch (error) {
            if (error["speech"]) {
                speechText = error["speech"];
            } else {
                speechText = DEFAULT_GENERIC_ERROR_SPEECH_TEXT;
            }
            console.trace("[NavigateSplitbyIntentHandler] Error! except: ", error);
        }

        console.log("[NavigateSplitbyIntentHandler] SPEECH TEXT = " + speechText);
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};

const resolve_splitby_query = async function(handlerInput) {
    const splitby_queries = {
        "splitby_query": _.get(handlerInput, "requestEnvelope.request.intent.slots.query.value"),
        "dtype_query":   _.get(handlerInput, "requestEnvelope.request.intent.slots.dtype_query.value"),
        "gene_query":    _.get(handlerInput, "requestEnvelope.request.intent.slots.gene_query.value")
    };

    const oov_entity = {};
    for (const [key, query] of Object.entries(splitby_queries)) {
        if (!_.isEmpty(query)) {
            let query_response = await resolve_oov_entity(handlerInput, query);
            if (query_response.data.entity_type === OOVEntityTypes.DTYPE && 
                (key === "splitby_query" || key === "dtype_query")) {
                oov_entity[MelvinAttributes.DTYPE] = _.get(query_response, "data.entity_data.value");
            }

            if (query_response.data.entity_type === OOVEntityTypes.GENE && 
                (key === "splitby_query" || key === "gene_query")) {
                oov_entity[MelvinAttributes.GENE_NAME] = _.get(query_response, "data.entity_data.value");
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
    console.log(`[resolve_splitby_query] updated melvin_aux_state: ${JSON.stringify(melvin_aux_state)}`);

    return melvin_aux_state;
};

const validate_splitby_melvin_state = function(melvin_state) {
    if (_.isEmpty(melvin_state[MelvinAttributes.STUDY_ABBRV])) {
        throw melvin_error(
            `[validate_splitby_melvin_state] missing cancer type | melvin_state: ${JSON.stringify(melvin_state)}`,
            MelvinIntentErrors.MISSING_STUDY,
            "I need to know a cancer type first. What cancer type are you interested in?"
        );

    } else if (_.isEmpty(melvin_state[MelvinAttributes.GENE_NAME])) {
        throw melvin_error(
            `[validate_splitby_melvin_state] missing gene | melvin_state: ${JSON.stringify(melvin_state)}`,
            MelvinIntentErrors.MISSING_GENE,
            "I need to know a gene first. What gene are you interested in?"
        );

    } else if (_.isEmpty(melvin_state[MelvinAttributes.DTYPE])) {
        throw melvin_error(
            `[validate_splitby_melvin_state] missing data type | melvin_state: ${JSON.stringify(melvin_state)}`,
            MelvinIntentErrors.MISSING_DTYPE,
            "I need to know a data type first. What data type are you interested in?"
        );
    }
};

const elicit_splitby_slots = async function (handlerInput, melvin_aux_state, pre_prompt = "") {
    console.log(`[elicit_splitby_slots] melvin_aux_state: ${JSON.stringify(melvin_aux_state)}`);

    if (_.isEmpty(melvin_aux_state[MelvinAttributes.DTYPE])) {
        return handlerInput.responseBuilder
            .speak(pre_prompt + "Which data type would you like to split by?")
            .reprompt("Which data type would you like to split by?")
            .addElicitSlotDirective("dtype_query")
            .getResponse();

    } else if (_.isEmpty(melvin_aux_state[MelvinAttributes.GENE_NAME])) {
        return handlerInput.responseBuilder
            .speak(pre_prompt + "Which gene would you like to split by?")
            .reprompt("Which gene would you like to split by?")
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

const validate_splitby_aux_state = function (melvin_state, splitby_state) {
    const query_dtypes = [melvin_state[MelvinAttributes.DTYPE], splitby_state[MelvinAttributes.DTYPE]];

    if (!is_splitby_supported(query_dtypes)) {
        throw melvin_error(
            "Error while validating required attributes "
            + `in melvin_state: ${JSON.stringify(melvin_state,)}, `
            + `splitby_state: ${JSON.stringify(splitby_state,)}`,
            MelvinIntentErrors.INVALID_STATE,
            "Sorry, this split-by operation is not supported."
        );
    }
};

const clean_splitby_aux_state = function (handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    sessionAttributes["MELVIN.AUX.STATE"] = {};
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
};

module.exports = { NavigateSplitbyIntentHandler };