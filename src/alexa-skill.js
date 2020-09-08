'use strict';

const Alexa = require('ask-sdk-core');
const moment = require('moment');

const { MELVIN_WELCOME_GREETING, MELVIN_APP_NAME, MelvinEventTypes } = require('./common.js');
const { add_event_configuration } = require('./navigation/handler_configuration.js');

const APLDocs = {
    welcome: require('../resources/APL/welcome.json'),
};
const { supportsAPL } = require('./utils/APL_utils.js');

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
    NavigateResetIntentHandler,
    NavigateJoinFilterIntentHandler,
    NavigateCompareIntentHandler,
    NavigateSplitbyIntentHandler,
    NavigateRestoreSessionIntentHandler,
    NavigateGoBackIntentHandler,
    NavigateRepeatIntentHandler
} = require('./skill_handlers/navigation_handler.js');

const {
    CNAAmplificationGeneIntentHandler,
    CNADeletionGeneIntent,
    CNAAlterationGeneIntent,
    NavigateCNAIntentHandler,
    NavigateCNAAmplificationsIntentHandler,
    NavigateCNADeletionsIntentHandler
} = require('./skill_handlers/cna_handler.js');

const {
    MutationCountIntentHandler,
    MutationPercentageIntentHandler,
    NavigateMutationsIntentHandler,
    NavigateMutationsDomainIntentHandler
} = require('./skill_handlers/mutations_handler.js');

const {
    NavigateExpressionIntentHandler
} = require('./skill_handlers/gene_expression_handler.js');

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

        if (supportsAPL(handlerInput)) {
            handlerInput.responseBuilder.addDirective({
                type: 'Alexa.Presentation.APL.RenderDocument',
                token: 'welcomeToken',
                version: '1.0',
                document: APLDocs.welcome,
                datasources: {
                    "bodyTemplate2Data": {
                        "type": "object",
                        "objectId": "bt2Sample",
                        "title": "Melvin",
                        "textContent": {
                            "title": {
                                "type": "PlainText",
                                "text": "Melvin"
                            },
                            "line1": {
                                "type": "PlainText",
                                "text": "Tell me about {cancer type}"
                            },
                            "line2": {
                                "type": "PlainText",
                                "text": "Tell me about {gene}"
                            }
                        },
                        "imageContent": {
                            "URL": "https://melvin-public.s3-ap-southeast-1.amazonaws.com/en-US_largeIconUri.png"
                        },
                        "logoUrl": "https://melvin-public.s3-ap-southeast-1.amazonaws.com/en-US_smallIconUri.png",
                        "hintText": "Try, \"Alexa, tell me about TP53\""
                    }
                },
            });

        } else {
            handlerInput.responseBuilder
                .withStandardCard(`Welcome to ${MELVIN_APP_NAME}`, 'You can start with a gene or cancer type.')
        }

        return handlerInput.responseBuilder
            .speak(MELVIN_WELCOME_GREETING)
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
add_event_configuration("CNAAmplificationGeneIntent", MelvinEventTypes.ANALYSIS_EVENT, CNAAmplificationGeneIntentHandler);
add_event_configuration("CNADeletionGeneIntent", MelvinEventTypes.ANALYSIS_EVENT, CNADeletionGeneIntent);
add_event_configuration("CNAAlterationGeneIntent", MelvinEventTypes.ANALYSIS_EVENT, CNAAlterationGeneIntent);
add_event_configuration("MutationCountIntent", MelvinEventTypes.ANALYSIS_EVENT, MutationCountIntentHandler);
add_event_configuration("MutationPercentageIntent", MelvinEventTypes.ANALYSIS_EVENT, MutationPercentageIntentHandler);
add_event_configuration("NavigateGeneDefinitionIntent", MelvinEventTypes.ANALYSIS_EVENT, NavigateGeneDefinitionIntentHandler);
add_event_configuration("NavigateOverviewIntent", MelvinEventTypes.ANALYSIS_EVENT, NavigateOverviewIntentHandler);
add_event_configuration("NavigateJoinFilterIntent", MelvinEventTypes.ANALYSIS_EVENT, NavigateJoinFilterIntentHandler);
add_event_configuration("NavigateCompareIntent", MelvinEventTypes.ANALYSIS_EVENT, NavigateCompareIntentHandler);
add_event_configuration("NavigateSplitbyIntent", MelvinEventTypes.ANALYSIS_EVENT, NavigateSplitbyIntentHandler);
add_event_configuration("NavigateMutationsIntent", MelvinEventTypes.ANALYSIS_EVENT, NavigateMutationsIntentHandler);
add_event_configuration("NavigateMutationsDomainIntent", MelvinEventTypes.ANALYSIS_EVENT, NavigateMutationsDomainIntentHandler);
add_event_configuration("NavigateCNAIntent", MelvinEventTypes.ANALYSIS_EVENT, NavigateCNAIntentHandler);
add_event_configuration("NavigateCNAAmplificationsIntent", MelvinEventTypes.ANALYSIS_EVENT, NavigateCNAAmplificationsIntentHandler);
add_event_configuration("NavigateCNADeletionsIntent", MelvinEventTypes.ANALYSIS_EVENT, NavigateCNADeletionsIntentHandler);
add_event_configuration("NavigateExpressionIntent", MelvinEventTypes.ANALYSIS_EVENT, NavigateExpressionIntentHandler);

add_event_configuration("ClinicalTrialsNearbyIntent", MelvinEventTypes.ANALYSIS_EVENT, ClinicalTrialsNearbyIntentHandler);
add_event_configuration("ClinicalTrialsWithinIntent", MelvinEventTypes.ANALYSIS_EVENT, ClinicalTrialsWithinIntentHandler);
add_event_configuration("ClinicalTrialClosestIntent", MelvinEventTypes.ANALYSIS_EVENT, ClinicalTrialClosestIntentHandler);


add_event_configuration("NavigateResetIntent", MelvinEventTypes.NAVIGATION_RESET_EVENT, NavigateResetIntentHandler);
add_event_configuration("NavigateGoBackIntent", MelvinEventTypes.NAVIGATION_REVERT_EVENT, NavigateGoBackIntentHandler);

add_event_configuration("NavigateRestoreSessionIntent", MelvinEventTypes.NAVIGATION_EVENT, NavigateRestoreSessionIntentHandler);
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
        CNAAmplificationGeneIntentHandler,
        CNADeletionGeneIntent,
        CNAAlterationGeneIntent,
        MutationCountIntentHandler,
        MutationPercentageIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,

        // Navigation handlers - system
        NavigateResetIntentHandler,
        NavigateRestoreSessionIntentHandler,
        NavigateGoBackIntentHandler,
        NavigateRepeatIntentHandler,

        // Navigation handlers - analysis
        NavigateGeneDefinitionIntentHandler,
        NavigateOverviewIntentHandler,
        NavigateJoinFilterIntentHandler,
        NavigateCompareIntentHandler,
        NavigateSplitbyIntentHandler,
        NavigateMutationsIntentHandler,
        NavigateMutationsDomainIntentHandler,
        NavigateCNAIntentHandler,
        NavigateCNAAmplificationsIntentHandler,
        NavigateCNADeletionsIntentHandler,
        NavigateExpressionIntentHandler,
        NavigateEmailIntentHandler,

        ClinicalTrialsNearbyIntentHandler,
        ClinicalTrialsWithinIntentHandler,
        ClinicalTrialClosestIntentHandler,

        // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
        IntentReflectorHandler)
    .addErrorHandlers(ErrorHandler)
    .lambda();