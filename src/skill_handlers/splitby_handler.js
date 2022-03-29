const _ = require("lodash");

const {
    DEFAULT_GENERIC_ERROR_SPEECH_TEXT,
    DEFAULT_ERROR_REPROMPT,
    SPLITBY_DTYPE_NOT_SUPPORTED,
    SPLITBY_INVALID_GENE,
    MelvinAttributes
} = require("../common.js");

const {
    get_melvin_state,
    clean_melvin_aux_state,
    validate_splitby_melvin_state,
    resolve_splitby_query,
    elicit_splitby_slots,
    is_splitby_supported
} = require("../utils/navigation_utils.js");

const { add_to_APL_text_pager } = require("../utils/APL_utils.js");
const { build_splitby_response } = require("../splitby/response_builder.js");
const { build_melvin_voice_response } = require("../utils/response_builder_utils.js");

const NavigateSplitbyIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "NavigateSplitbyIntent";
    },
    async handle(handlerInput) {
        let speech_text = "";
        let reprompt_text = "";
        try {
            // validate melvin_state for required attributes
            const melvin_state = get_melvin_state(handlerInput);
            validate_splitby_melvin_state(melvin_state);

            // cleanup splitby state whenever a new dialog flow is initiated
            if (_.get(handlerInput, "requestEnvelope.request.dialogState") === "STARTED") {
                clean_melvin_aux_state(handlerInput);
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
            const query_dtypes = [melvin_state[MelvinAttributes.DTYPE], splitby_state[MelvinAttributes.DTYPE]];
            if (!is_splitby_supported(query_dtypes)) {
                speech_text = build_melvin_voice_response(SPLITBY_DTYPE_NOT_SUPPORTED);
                reprompt_text = build_melvin_voice_response(SPLITBY_DTYPE_NOT_SUPPORTED);
                return handlerInput.responseBuilder
                    .speak()
                    .reprompt()
                    .addElicitSlotDirective("dtype_query")
                    .withShouldEndSession(false)
                    .getResponse();
            }

            if (_.isEqual(melvin_state, splitby_state)) {
                speech_text = build_melvin_voice_response(SPLITBY_INVALID_GENE);
                reprompt_text = build_melvin_voice_response(SPLITBY_INVALID_GENE);
                return handlerInput.responseBuilder
                    .speak(speech_text)
                    .reprompt(reprompt_text)
                    .addElicitSlotDirective("gene_query")
                    .withShouldEndSession(false)
                    .getResponse();
            }

            // generate the response for the requested split-by analysis
            let response = await build_splitby_response(handlerInput, melvin_state, splitby_state);
            speech_text = response["speech_text"];
            reprompt_text = response["reprompt_text"];
            console.info(`[NavigateSplitbyIntentHandler] response: ${JSON.stringify(response)}`);
        } catch (error) {
            speech_text = build_melvin_voice_response(_.get(error, "speech", DEFAULT_GENERIC_ERROR_SPEECH_TEXT));
            reprompt_text = build_melvin_voice_response(_.get(error, "speech", DEFAULT_ERROR_REPROMPT));
            add_to_APL_text_pager(handlerInput, "");
            console.error(`[NavigateSplitbyIntentHandler] error: ${error.message}`, error);
        } finally {
            // cleanup splitby state after dialog management flow is complete
            clean_melvin_aux_state(handlerInput);
        }

        return handlerInput.responseBuilder
            .speak(speech_text)
            .reprompt(reprompt_text)
            .withShouldEndSession(false)
            .getResponse();
    }
};

module.exports = { NavigateSplitbyIntentHandler };