const Speech = require("ssml-builder");
const _ = require("lodash");

const { get_gene_by_name } = require("../http_clients/gene_client.js");

const {
    MelvinExplorerErrors,
    DataTypes,
    DEFAULT_GENERIC_ERROR_SPEECH_TEXT,
} = require("../common.js");

const { build_gene_definition_response } = require("../gene/gene_definition_response_builder.js");

const {
    validate_action_intent_state, update_melvin_state 
} = require("../navigation/navigation_helper.js");

const SearchGeneIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "SearchGeneIntent";
    },
    async handle(handlerInput) {

        let gene_name = _.get(handlerInput, "requestEnvelope.request.intent.slots.gene.value");
        if (_.isNil(gene_name)) {
            gene_name = _.get(handlerInput, "requestEnvelope.request.intent.slots.query.value").replace(/\s/g, "");
        }

        let speechText = "";
        let speech = new Speech();
        let params = { gene_name };

        try {
            const response = await get_gene_by_name(params);
            if (response["data"] && response["data"]["location"] && response["data"]["summary"]) {
                speech.say(`${gene_name} is at ${response.data.location}`);
                speech.pause("100ms");
                const sentence_sum = response.data.summary.match(/\S.*?\."?(?=\s|$)/g)[0];
                speech.say(sentence_sum);
                speechText = speech.ssml();

            } else if (response["error"] && response["error"] === MelvinExplorerErrors.UNIDENTIFIED_GENE) {
                speech.say(`Sorry, I could not find a gene called ${gene_name}`);
                speechText = speech.ssml();

            } else {
                speech.say("Sorry, there was a problem while fetching the data. Please try again.");
                speechText = speech.ssml();
            }

        } catch (error) {
            speech.say("Sorry, something went wrong while processing the request. Please try again later.");
            speechText = speech.ssml();
            console.error(`SearchGeneIntentHandler: message: ${error.message}`, error);
        }

        console.log("SPEECH TEXT = " + speechText);
        return handlerInput.responseBuilder
            .speak(speechText)
            .getResponse();
    }
};

const NavigateGeneDefinitionIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "NavigateGeneDefinitionIntent";
    },
    async handle(handlerInput) {
        let speechText = "";

        try {
            const state_change = await update_melvin_state(handlerInput);
            const melvin_state = validate_action_intent_state(handlerInput, state_change, DataTypes.GENE_DEFINITION);
            const params = { ...melvin_state };
            const response = await build_gene_definition_response(params);
            speechText = response["speech_text"];

        } catch (error) {
            if (error["speech"]) {
                speechText = error["speech"];
            } else {
                speechText = DEFAULT_GENERIC_ERROR_SPEECH_TEXT;
            }
            console.error("Error in NavigateGeneDefinitionIntent", error);
        }

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};

module.exports = {
    SearchGeneIntentHandler,
    NavigateGeneDefinitionIntentHandler
};