'use strict';

const Alexa = require('ask-sdk-core');
const moment = require('moment');

const { MELVIN_WELCOME_GREETING, MELVIN_APP_NAME, MelvinEventTypes } = require('./common.js');
const { add_event_configuration } = require('./navigation/handler_configuration.js');

const {
    RequestLogInterceptor,
    ResponseLogInterceptor,
    UserUtteranceTrackInterceptor
} = require('./interceptors.js');

const {
    SearchGeneIntentHandler,
    NavigateGeneDefinitionIntentHandler
} = require('./skill_handlers/gene_handler.js');

const {
    NavigateStartIntentHandler,
    NavigateResetIntentHandler,
    NavigateJoinFilterIntentHandler,
    NavigateRestoreSessionIntentHandler,
    NavigateGoBackIntentHandler,
    NavigateRepeatIntentHandler
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

const { NavigateOverviewIntentHandler } = require('./skill_handlers/overview_handler.js');

const { NavigateEmailIntentHandler } = require('./skill_handlers/email_handler.js');

const {
    ClinicalTrialsNearbyIntentHandler,
    ClinicalTrialsWithinIntentHandler,
    ClinicalTrialClosestIntentHandler
} = require('./skill_handlers/clinical_trials_handler.js');

const sessions_doc = require('./dao/sessions.js');

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    async handle(handlerInput) {
        if (handlerInput.requestEnvelope.session.new) {
            const new_session_rec = {
                'user_id': handlerInput.requestEnvelope.session.user.userId,
                'session_start': moment(handlerInput.requestEnvelope.request.timestamp).valueOf(),
                'session_id': handlerInput.requestEnvelope.session.sessionId,
                'request': handlerInput.requestEnvelope.request,
                'device': handlerInput.requestEnvelope.context.System.device
            };
            await sessions_doc.addUserSession(new_session_rec);
        }

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

add_event_configuration("SearchGeneIntent", MelvinEventTypes.ANALYSIS_EVENT, SearchGeneIntentHandler);
add_event_configuration("CNVAmplificationGeneIntent", MelvinEventTypes.ANALYSIS_EVENT, CNVAmplificationGeneIntentHandler);
add_event_configuration("CNVDeletionGeneIntent", MelvinEventTypes.ANALYSIS_EVENT, CNVDeletionGeneIntent);
add_event_configuration("CNVAlterationGeneIntent", MelvinEventTypes.ANALYSIS_EVENT, CNVAlterationGeneIntent);
add_event_configuration("MutationCountIntent", MelvinEventTypes.ANALYSIS_EVENT, MutationCountIntentHandler);
add_event_configuration("MutationPercentageIntent", MelvinEventTypes.ANALYSIS_EVENT, MutationPercentageIntentHandler);
add_event_configuration("NavigateGeneDefinitionIntent", MelvinEventTypes.ANALYSIS_EVENT, NavigateGeneDefinitionIntentHandler);
add_event_configuration("NavigateOverviewIntent", MelvinEventTypes.ANALYSIS_EVENT, NavigateOverviewIntentHandler);
add_event_configuration("NavigateJoinFilterIntent", MelvinEventTypes.ANALYSIS_EVENT, NavigateJoinFilterIntentHandler);
add_event_configuration("NavigateMutationsIntent", MelvinEventTypes.ANALYSIS_EVENT, NavigateMutationsIntentHandler);
add_event_configuration("NavigateMutationsDomainIntent", MelvinEventTypes.ANALYSIS_EVENT, NavigateMutationsDomainIntentHandler);
add_event_configuration("NavigateCNVIntent", MelvinEventTypes.ANALYSIS_EVENT, NavigateCNVIntentHandler);
add_event_configuration("NavigateCNVAmplificationsIntent", MelvinEventTypes.ANALYSIS_EVENT, NavigateCNVAmplificationsIntentHandler);
add_event_configuration("NavigateCNVDeletionsIntent", MelvinEventTypes.ANALYSIS_EVENT, NavigateCNVDeletionsIntentHandler);

add_event_configuration("ClinicalTrialsNearbyIntent", MelvinEventTypes.ANALYSIS_EVENT, ClinicalTrialsNearbyIntentHandler);
add_event_configuration("ClinicalTrialsWithinIntent", MelvinEventTypes.ANALYSIS_EVENT, ClinicalTrialsWithinIntentHandler);
add_event_configuration("ClinicalTrialClosestIntent", MelvinEventTypes.ANALYSIS_EVENT, ClinicalTrialClosestIntentHandler);


add_event_configuration("NavigateStartIntent", MelvinEventTypes.NAVIGATION_EVENT, NavigateStartIntentHandler);
add_event_configuration("NavigateResetIntent", MelvinEventTypes.NAVIGATION_EVENT, NavigateResetIntentHandler);
add_event_configuration("NavigateRestoreSessionIntent", MelvinEventTypes.NAVIGATION_EVENT, NavigateRestoreSessionIntentHandler);
add_event_configuration("NavigateGoBackIntent", MelvinEventTypes.NAVIGATION_EVENT, NavigateGoBackIntentHandler);
add_event_configuration("NavigateRepeatIntent", MelvinEventTypes.NAVIGATION_EVENT, NavigateRepeatIntentHandler);


add_event_configuration("NavigateEmailIntent", MelvinEventTypes.IRS_EVENT, NavigateEmailIntentHandler);



// This handler acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestInterceptors(RequestLogInterceptor)
    .addResponseInterceptors(ResponseLogInterceptor)
    .addResponseInterceptors(UserUtteranceTrackInterceptor)
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

        // Navigation handlers - system
        NavigateStartIntentHandler,
        NavigateResetIntentHandler,
        NavigateRestoreSessionIntentHandler,
        NavigateGoBackIntentHandler,
        NavigateRepeatIntentHandler,

        // Navigation handlers - analysis
        NavigateGeneDefinitionIntentHandler,
        NavigateOverviewIntentHandler,
        NavigateJoinFilterIntentHandler,
        NavigateMutationsIntentHandler,
        NavigateMutationsDomainIntentHandler,
        NavigateCNVIntentHandler,
        NavigateCNVAmplificationsIntentHandler,
        NavigateCNVDeletionsIntentHandler,
        NavigateEmailIntentHandler,

        ClinicalTrialsNearbyIntentHandler,
        ClinicalTrialsWithinIntentHandler,
        ClinicalTrialClosestIntentHandler,

        // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
        IntentReflectorHandler)
    .addErrorHandlers(ErrorHandler)
    .lambda();