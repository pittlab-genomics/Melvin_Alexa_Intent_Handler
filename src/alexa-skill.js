"use strict";
const Alexa = require("ask-sdk-core");
const ddbAdapter = require("ask-sdk-dynamodb-persistence-adapter");
var AWS = require("aws-sdk");

const { MelvinEventTypes } = require("./common.js");
const { add_event_configuration } = require("./utils/handler_configuration.js");

const {
    RequestLogInterceptor,
    ResponseLogInterceptor,
    UserUtteranceTrackInterceptor
} = require("./interceptors.js");

const {
    NavigateGeneDefinitionIntentHandler,
    NavigateGeneTargetIntentHandler
} = require("./skill_handlers/gene_handler.js");

const {
    NavigateResetIntentHandler,
    NavigateJoinFilterIntentHandler,
    NavigateCompareIntentHandler,
    NavigateRestoreSessionIntentHandler,
    NavigateGoBackIntentHandler,
    NavigateRepeatIntentHandler
} = require("./skill_handlers/navigation_handler.js");

const { LaunchRequestHandler } = require("./skill_handlers/launch_handler.js");
const { NavigateSplitbyIntentHandler } = require("./skill_handlers/splitby_handler.js");
const {
    EnableUserPreferenceIntentHandler, DisableUserPreferenceIntentHandler 
} = require("./skill_handlers/user_preference_handler.js");

// const {
//     NavigateCNAIntentHandler,
//     NavigateGainIntentHandler,
//     NavigateLossIntentHandler
// } = require("./skill_handlers/cna_handler.js");

// const {
//     NavigateMutationsIntentHandler,
//     NavigateMutationDomainsIntentHandler,
//     NavigateIndelsIntentHandler,
//     NavigateIndelDomainsIntentHandler,
//     NavigateSNVsIntentHandler,
//     NavigateSNVDomainsIntentHandler
// } = require("./skill_handlers/mutations_handler.js");

// const { NavigateExpressionIntentHandler } = require("./skill_handlers/gene_expression_handler.js");

const { NavigateEmailIntentHandler } = require("./skill_handlers/email_handler.js");
const { add_to_APL_text_pager } = require("./utils/APL_utils.js");

// const {
//     ClinicalTrialsNearbyIntentHandler,
//     ClinicalTrialsWithinIntentHandler,
//     ClinicalTrialClosestIntentHandler
// } = require("./skill_handlers/clinical_trials_handler.js");


const HelpIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "AMAZON.HelpIntent";
    },
    handle(handlerInput) {
        const speechText = "Melvin is a voice-based tool that allows you to interrogate cancer genomics data. " +
            "To start exploring, just say 'Tell me about' followed by the name of a gene, cancer type, or data type. " +
            "I am able to remember our conversation, so you can ask me to build compound queries one step at a time. " +
            "For example, if you say, 'Tell me about TP53', followed by 'Show me breast cancer', I will provide an analytical summary of TP53 in breast cancer. " +
            "If you subsequently ask 'Show me mutations', I will provided a detailed breakdown of TP53 mutations in breast cancer. " +
            "You can swap any of these variables by providing another gene, cancer type, or data type. " +
            "If you ever feel stuck, just say 'Reset' and I will reset the state to start from scratch. " +
            "If you are new to the skill, check out our videos and sample conversations on the webpage provided in the skill description. " +
            "Now back to the skill, What would you like to know?";
        const repromptText = "To start exploring, just say 'Tell me about' followed by the name of a gene, cancer type, or data type. " +
            "What would you like to know?";

        add_to_APL_text_pager(handlerInput, "Check out our videos and sample conversations at https://pittgenomics.gitlab.io/melvin_docs");
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(repromptText)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && (handlerInput.requestEnvelope.request.intent.name === "AMAZON.CancelIntent"
                || handlerInput.requestEnvelope.request.intent.name === "AMAZON.StopIntent");
    },
    handle(handlerInput) {
        const speechText = "Goodbye!";
        return handlerInput.responseBuilder
            .speak(speechText)
            .withShouldEndSession(true)
            .getResponse();
    }
};

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "SessionEndedRequest";
    },
    handle(handlerInput) {
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder
            .withShouldEndSession(true)
            .getResponse();
    }
};

// The intent reflector is used for interaction model testing and debugging.
// It will simply repeat the intent the user said. You can create custom handlers
// for your intents by defining them above, then also adding them to the request
// handler chain below.
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest";
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
        const speechText = "Sorry, I'm unable to process that request for the moment. Please try again later. What else?";
        const repromptText = "What else?";

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(repromptText)
            .getResponse();
    }
};


add_event_configuration("NavigateGeneDefinitionIntent", MelvinEventTypes.ANALYSIS_EVENT, 
    NavigateGeneDefinitionIntentHandler);
add_event_configuration("NavigateGeneTargetIntent", MelvinEventTypes.ANALYSIS_EVENT, 
    NavigateGeneTargetIntentHandler);
add_event_configuration("NavigateJoinFilterIntent", MelvinEventTypes.ANALYSIS_EVENT, NavigateJoinFilterIntentHandler);
add_event_configuration("NavigateCompareIntent", MelvinEventTypes.ANALYSIS_EVENT, NavigateCompareIntentHandler);
add_event_configuration("NavigateSplitbyIntent", MelvinEventTypes.ANALYSIS_EVENT, NavigateSplitbyIntentHandler);
// add_event_configuration("NavigateMutationsIntent", MelvinEventTypes.ANALYSIS_EVENT, NavigateMutationsIntentHandler);
// add_event_configuration("NavigateMutationDomainsIntent", MelvinEventTypes.ANALYSIS_EVENT, 
//     NavigateMutationDomainsIntentHandler);
// add_event_configuration("NavigateIndelsIntent", MelvinEventTypes.ANALYSIS_EVENT, NavigateIndelsIntentHandler);
// add_event_configuration("NavigateIndelDomainsIntent", MelvinEventTypes.ANALYSIS_EVENT, 
//     NavigateIndelDomainsIntentHandler);
// add_event_configuration("NavigateSNVsIntent", MelvinEventTypes.ANALYSIS_EVENT, NavigateSNVsIntentHandler);
// add_event_configuration("NavigateSNVDomainsIntent", MelvinEventTypes.ANALYSIS_EVENT, 
//     NavigateSNVDomainsIntentHandler);

// add_event_configuration("NavigateCNAIntent", MelvinEventTypes.ANALYSIS_EVENT, NavigateCNAIntentHandler);
// add_event_configuration("NavigateGainIntent", MelvinEventTypes.ANALYSIS_EVENT, 
//     NavigateGainIntentHandler);
// add_event_configuration("NavigateLossIntent", MelvinEventTypes.ANALYSIS_EVENT, 
//     NavigateLossIntentHandler);
// add_event_configuration("NavigateExpressionIntent", MelvinEventTypes.ANALYSIS_EVENT, NavigateExpressionIntentHandler);

// add_event_configuration("ClinicalTrialsNearbyIntent", MelvinEventTypes.ANALYSIS_EVENT, 
//     ClinicalTrialsNearbyIntentHandler);
// add_event_configuration("ClinicalTrialsWithinIntent", MelvinEventTypes.ANALYSIS_EVENT, 
//     ClinicalTrialsWithinIntentHandler);
// add_event_configuration("ClinicalTrialClosestIntent", MelvinEventTypes.ANALYSIS_EVENT, 
//     ClinicalTrialClosestIntentHandler);


add_event_configuration("NavigateResetIntent", MelvinEventTypes.NAVIGATION_RESET_EVENT, NavigateResetIntentHandler);
add_event_configuration("NavigateGoBackIntent", MelvinEventTypes.NAVIGATION_REVERT_EVENT, NavigateGoBackIntentHandler);

add_event_configuration("NavigateRestoreSessionIntent", MelvinEventTypes.NAVIGATION_EVENT, 
    NavigateRestoreSessionIntentHandler);
add_event_configuration("NavigateRepeatIntent", MelvinEventTypes.NAVIGATION_EVENT, NavigateRepeatIntentHandler);


add_event_configuration("NavigateEmailIntent", MelvinEventTypes.IRS_EVENT, NavigateEmailIntentHandler);
add_event_configuration("EnableUserPreferenceIntent", MelvinEventTypes.ENABLE_PREFERENCE_EVENT, 
    EnableUserPreferenceIntentHandler);
add_event_configuration("DisableUserPreferenceIntent", MelvinEventTypes.DISABLE_PREFERENCE_EVENT, 
    DisableUserPreferenceIntentHandler);



// This handler acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestInterceptors(RequestLogInterceptor)
    .addResponseInterceptors(ResponseLogInterceptor)
    .addResponseInterceptors(UserUtteranceTrackInterceptor)
    .addRequestHandlers(
        LaunchRequestHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
        EnableUserPreferenceIntentHandler,
        DisableUserPreferenceIntentHandler,

        // Navigation handlers - system
        NavigateResetIntentHandler,
        NavigateRestoreSessionIntentHandler,
        NavigateGoBackIntentHandler,
        NavigateRepeatIntentHandler,

        // Navigation handlers - analysis
        NavigateGeneDefinitionIntentHandler,
        NavigateGeneTargetIntentHandler,
        NavigateJoinFilterIntentHandler,
        NavigateCompareIntentHandler,
        NavigateSplitbyIntentHandler,
        // NavigateMutationsIntentHandler,
        // NavigateMutationDomainsIntentHandler,
        // NavigateIndelsIntentHandler,
        // NavigateIndelDomainsIntentHandler,
        // NavigateSNVsIntentHandler,
        // NavigateSNVDomainsIntentHandler,
        // NavigateCNAIntentHandler,
        // NavigateGainIntentHandler,
        // NavigateLossIntentHandler,
        // NavigateExpressionIntentHandler,
        NavigateEmailIntentHandler,

        // ClinicalTrialsNearbyIntentHandler,
        // ClinicalTrialsWithinIntentHandler,
        // ClinicalTrialClosestIntentHandler,

        // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
        IntentReflectorHandler)
    .addErrorHandlers(ErrorHandler)
    .withApiClient(new Alexa.DefaultApiClient())
    .withPersistenceAdapter(
        new ddbAdapter.DynamoDbPersistenceAdapter({
            tableName:      process.env.DYNAMODB_TABLE_USER_PREFERENCE,
            createTable:    false,
            dynamoDBClient: new AWS.DynamoDB({
                apiVersion: "latest", region: "eu-west-1"
            })
        })
    )
    .lambda();