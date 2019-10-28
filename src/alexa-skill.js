'use strict';

const Alexa = require('ask-sdk-core');
const _ = require('lodash');
const { RequestLogInterceptor, ResponseLogInterceptor } = require('./interceptors.js');
const { SearchGeneIntentHandler } = require('./skill_handlers/gene_handler.js');
const {
    NavigateStartIntentHandler,
    NavigateResetIntentHandler,
    NavigateJoinFilterIntentHandler
} = require('./skill_handlers/navigation_handler.js');
const {
    CNVAmplificationGeneIntentHandler,
    CNVDeletionGeneIntent,
    CNVAlterationGeneIntent,
    NavigateCNVIntentHandler
} = require('./skill_handlers/cnv_handler.js');
const {
    MutationCountIntentHandler,
    MutationPercentageIntentHandler,
    NavigateMutationsIntentHandler,
    NavigateMutationsDomainIntentHandler
} = require('./skill_handlers/mutations_handler.js');

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speechText = 'Welcome to Melvin.'
        const reprompt_text = 'What would you like to know? You can ask me about a gene or a cancer type.'

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(reprompt_text)
            .getResponse();
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speechText = 'You can say hello to me! How can I help?';

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
                || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speechText = 'Goodbye!';
        return handlerInput.responseBuilder
            .speak(speechText)
            .getResponse();
    }
};

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse();
    }
};

// The intent reflector is used for interaction model testing and debugging.
// It will simply repeat the intent the user said. You can create custom handlers
// for your intents by defining them above, then also adding them to the request
// handler chain below.
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = handlerInput.requestEnvelope.request.intent.name;
        const speechText = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt('Would you like to try again?')
            .getResponse();
    }
};

// Generic error handling to capture any syntax or routing errors. If you receive an error
// stating the request handler chain is not found, you have not implemented a handler for
// the intent being invoked or included it in the skill builder below.
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`~~~~ Error handled: ${error.message}`, error);
        const speechText = `Sorry, I'm unable to process that request for the moment. Please try again later.`;

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};


const TestIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'TestIntent';
    },
    handle(handlerInput) {
        let speechText = 'This is a test handler response.';

        let gene_name = _.get(handlerInput, 'requestEnvelope.request.intent.slots.gene.value');
        let study_name = _.get(handlerInput, 'requestEnvelope.request.intent.slots.study.value');
        let study_id = _.get(handlerInput, 'requestEnvelope.request.intent.slots.study.resolutions.resolutionsPerAuthority[0].values[0].value.id');

        let params = { gene_name, study_name, study_id };
        console.log(`TestIntentHandler params = ${JSON.stringify(params)}`);

        if (!_.isNil(gene_name)) {
            speechText += `Gene name is ${gene_name}.`
        }

        if (!_.isNil(study_name)) {
            speechText += `Study name is ${study_name} and study id is ${study_id}.`
        }

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};

// This handler acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestInterceptors(RequestLogInterceptor)
    .addResponseInterceptors(ResponseLogInterceptor)
    .addRequestHandlers(
        LaunchRequestHandler,
        SearchGeneIntentHandler,
        TestIntentHandler,
        CNVAmplificationGeneIntentHandler,
        CNVDeletionGeneIntent,
        CNVAlterationGeneIntent,
        MutationCountIntentHandler,
        MutationPercentageIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,

        // Navigation handlers
        NavigateStartIntentHandler,
        NavigateResetIntentHandler,
        NavigateJoinFilterIntentHandler,
        NavigateMutationsIntentHandler,
        NavigateMutationsDomainIntentHandler,
        NavigateCNVIntentHandler,

        // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
        IntentReflectorHandler)
    .addErrorHandlers(ErrorHandler)
    .lambda();