const Speech = require("ssml-builder");
const _ = require("lodash");

const {
    DataTypes,
    MelvinAttributes,
    DEFAULT_GENERIC_ERROR_SPEECH_TEXT
} = require("../common.js");

const { get_mutations_tcga_stats } = require("../http_clients/mutations_tcga_client.js");

const {
    validate_action_intent_state,
    update_melvin_state
} = require("../utils/navigation_utils.js");

const {
    build_mutations_response,
    build_mutations_domain_response
} = require("../mutations/response_builder.js");


const MutationCountIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && (handlerInput.requestEnvelope.request.intent.name === "MutationGeneCountIntent" ||
                handlerInput.requestEnvelope.request.intent.name === "MutationStudyGeneCountIntent");
    },
    async handle(handlerInput) {
        let speechText = "";
        let speech = new Speech();

        try {
            let gene_name = _.get(handlerInput, "requestEnvelope.request.intent.slots.gene.value");
            let params = { [MelvinAttributes.GENE_NAME]: gene_name };

            let study = _.get(handlerInput, "requestEnvelope.request.intent.slots.study.value");
            if (!_.isNil(study)) {
                params[MelvinAttributes.STUDY_ABBRV] = handlerInput.requestEnvelope.request.intent.slots
                    .study.resolutions.resolutionsPerAuthority[0].values[0].value.id;
            }

            let response = await get_mutations_tcga_stats(params);
            if (response["data"]["patient_count"] && !_.isNil(study)) {
                speech.say(`${response.data.patient_count} ${study} cancer patients have ${gene_name} mutation.`);
                speechText = speech.ssml();

            } else if (response["data"]["patient_count"] && _.isNil(study)) {
                speech.say(`${response.data.patient_count} patients have ${gene_name} mutation.`);
                speechText = speech.ssml();

            } else if (response["error"] && response["error"] === "UNIDENTIFIED_GENE") {
                speech.say(`Sorry, I could not find a gene called ${gene_name}`);
                speechText = speech.ssml();

            } else {
                speech.say("Sorry, there was a problem while fetching the data. Please try again.");
                speechText = speech.ssml();
            }

        } catch (error) {
            if (error["speech"]) {
                speechText = error["speech"];
            } else {
                speechText = DEFAULT_GENERIC_ERROR_SPEECH_TEXT;
            }
            console.error(`MutationCountIntentHandler: message: ${error.message}`, error);
        }

        console.log("SPEECH TEXT = " + speechText);
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};

const MutationPercentageIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && (handlerInput.requestEnvelope.request.intent.name === "MutationGenePercentIntent" ||
                handlerInput.requestEnvelope.request.intent.name === "MutationStudyGenePercentIntent");
    },
    async handle(handlerInput) {

        let speechText = "";
        let speech = new Speech();

        try {
            let gene_name = _.get(handlerInput, "requestEnvelope.request.intent.slots.gene.value");
            let params = { [MelvinAttributes.GENE_NAME]: gene_name };

            let study = _.get(handlerInput, "requestEnvelope.request.intent.slots.study.value");
            if (!_.isNil(study)) {
                params[MelvinAttributes.STUDY_ABBRV] = handlerInput.requestEnvelope.request.intent.slots
                    .study.resolutions.resolutionsPerAuthority[0].values[0].value.id;
            }

            let response = await get_mutations_tcga_stats(params);
            if (response["data"]["patient_percentage"] && !_.isNil(study)) {
                speech
                    .sayAs({
                        word: response["data"]["patient_percentage"], interpret: "digits" 
                    })
                    .say(`percentage of ${study} cancer patients have ${gene_name} mutation.`);
                speechText = speech.ssml();

            } else if (response["data"]["patient_percentage"] && _.isNil(study)) {
                speech
                    .sayAs({
                        word: response["data"]["patient_percentage"], interpret: "digits" 
                    })
                    .say(`percentage of patients have ${gene_name} mutation.`);
                speechText = speech.ssml();

            } else if (response["error"] && response["error"] === "UNIDENTIFIED_GENE") {
                speech.say(`Sorry, I could not find a gene called ${gene_name}`);
                speechText = speech.ssml();

            } else {
                speech.say("Sorry, there was a problem while fetching the data. Please try again.");
                speechText = speech.ssml();
            }

        } catch (error) {
            if (error["speech"]) {
                speechText = error["speech"];
            } else {
                speechText = DEFAULT_GENERIC_ERROR_SPEECH_TEXT;
            }
            console.error(`MutationCountIntentHandler: message: ${error.message}`, error);
        }

        console.log("SPEECH TEXT = " + speechText);
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};



const NavigateMutationsIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "NavigateMutationsIntent";
    },
    async handle(handlerInput) {
        let speechText = "";

        try {
            const state_change = await update_melvin_state(handlerInput);
            const melvin_state = validate_action_intent_state(handlerInput, state_change, DataTypes.MUTATIONS);
            const response = await build_mutations_response(handlerInput, melvin_state);
            speechText = response["speech_text"];

        } catch (error) {
            if (error["speech"]) {
                speechText = error["speech"];
            } else {
                speechText = DEFAULT_GENERIC_ERROR_SPEECH_TEXT;
            }
            console.error(`NavigateMutationsIntentHandler: message: ${error.message}`, error);
        }

        console.log("SPEECH TEXT = " + speechText);
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};

const NavigateMutationsDomainIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "NavigateMutationsDomainIntent";
    },
    async handle(handlerInput) {
        let speechText = "";
        try {
            const state_change = await update_melvin_state(handlerInput);
            const melvin_state = validate_action_intent_state(handlerInput, state_change, DataTypes.PROTEIN_DOMAINS);
            const domain_response = await build_mutations_domain_response(handlerInput, melvin_state);
            speechText = domain_response["speech_text"];

        } catch (error) {
            if (error["speech"]) {
                speechText = error["speech"];
            } else {
                speechText = DEFAULT_GENERIC_ERROR_SPEECH_TEXT;
            }
            console.error("Error in NavigateMutationsDomainIntentHandler", error);
        }

        console.log("SPEECH TEXT = " + speechText);
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};

module.exports = {
    MutationCountIntentHandler,
    MutationPercentageIntentHandler,
    NavigateMutationsIntentHandler,
    NavigateMutationsDomainIntentHandler
};