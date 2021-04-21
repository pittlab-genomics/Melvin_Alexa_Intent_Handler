const _ = require("lodash");

const {
    DEFAULT_GENERIC_ERROR_SPEECH_TEXT,
    MelvinAttributes
} = require("../common.js");

const {
    get_melvin_state,
    clean_melvin_aux_state,
    validate_splitby_melvin_state,
    resolve_splitby_query,
    elicit_splitby_slots,
    validate_splitby_aux_state    
} = require("../utils/navigation_utils.js");

const { build_splitby_response } = require("../splitby/response_builder.js");

const NavigateSplitbyIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "NavigateSplitbyIntent";
    },
    async handle(handlerInput) {
        let speechText = "";
        let repromptText = "";
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
            validate_splitby_aux_state(melvin_state, splitby_state);

            // generate the response for the requested split-by analysis
            let response = await build_splitby_response(handlerInput, melvin_state, splitby_state);
            speechText = response["speech_text"];

        } catch (error) {
            if (error["speech"]) {
                speechText = error["speech"];
            } else {
                speechText = DEFAULT_GENERIC_ERROR_SPEECH_TEXT;
            }
            console.trace("[NavigateSplitbyIntentHandler] Error! except: ", error);
        } finally {
            // cleanup splitby state after dialog management flow is complete
            clean_melvin_aux_state(handlerInput);
        }

        if(!speechText.trim().endsWith("?")) {
            speechText += " What else?";
            repromptText = "What else?";
        } else {
            repromptText = speechText;
        }
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(repromptText)
            .getResponse();
    }
};

module.exports = { NavigateSplitbyIntentHandler };