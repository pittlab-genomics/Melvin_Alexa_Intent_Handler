'use strict';

const Alexa = require('ask-sdk-core');
const _ = require('lodash');

const { MELVIN_WELCOME_GREETING, MELVIN_APP_NAME } = require('./common.js');
const { RequestLogInterceptor, ResponseLogInterceptor } = require('./interceptors.js');
const {
    SearchGeneIntentHandler,
    NavigateGeneDefinitionIntentHandler
} = require('./skill_handlers/gene_handler.js');
const {
    NavigateStartIntentHandler,
    NavigateResetIntentHandler,
    NavigateJoinFilterIntentHandler
} = require('./skill_handlers/navigation_handler.js');
const {
    CNVAmplificationGeneIntentHandler,
    CNVDeletionGeneIntent,
    CNVAlterationGeneIntent,
    NavigateCNVIntentHandler,
    NavigateCNVAmplificationsIntentHandler,
    NavigateCNVDeletionsIntentHandler
} = require('./skill_handlers/cnv_handler.js');
const {
    MutationCountIntentHandler,
    MutationPercentageIntentHandler,
    NavigateMutationsIntentHandler,
    NavigateMutationsDomainIntentHandler
} = require('./skill_handlers/mutations_handler.js');

const { NavigateEmailIntentHandler } = require('./skill_handlers/email_handler.js');

const { ClinicalTrialsNearbyIntentHandler } = require('./skill_handlers/clinical_trials_handler.js');

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    handle(handlerInput) {
        const reprompt_text = 'What would you like to know? You can ask me about a gene or cancer type.'

        return handlerInput.responseBuilder
            .speak(MELVIN_WELCOME_GREETING)
            .withStandardCard(`Welcome to ${MELVIN_APP_NAME}`, 'You can start with a gene or cancer type.')
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
        console.info(`[IntentReflectorHandler] intentName: ${intentName}`);
        const speechText = "Sorry, I couldn't pick it up. Would you like to try again?";
        const repromptText = "Would you like to try again?";

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(repromptText)
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

// This handler acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestInterceptors(RequestLogInterceptor)
    .addResponseInterceptors(ResponseLogInterceptor)
    .addRequestHandlers(
        LaunchRequestHandler,
        SearchGeneIntentHandler,
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
        NavigateGeneDefinitionIntentHandler,
        NavigateJoinFilterIntentHandler,
        NavigateMutationsIntentHandler,
        NavigateMutationsDomainIntentHandler,
        NavigateCNVIntentHandler,
        NavigateCNVAmplificationsIntentHandler,
        NavigateCNVDeletionsIntentHandler,
        NavigateEmailIntentHandler,

        ClinicalTrialsNearbyIntentHandler,

        // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
        IntentReflectorHandler)
    .addErrorHandlers(ErrorHandler)
    .lambda();