const Alexa = require("ask-sdk-core");
const ddbAdapter = require("ask-sdk-dynamodb-persistence-adapter");
const AWS = require("aws-sdk");

const {
    MelvinEventTypes, GOODBYE_SPEECH
} = require("./common.js");
const { add_event_configuration } = require("./utils/handler_configuration.js");

const {
    RequestLogInterceptor,
    ResponseLogInterceptor,
    UserUtteranceTrackInterceptor,
    STSCredentialsInterceptor
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

const {
    build_ssml_response_from_nunjucks, build_melvin_voice_response
} = require("./utils/response_builder_utils.js");

const { LaunchRequestHandler } = require("./skill_handlers/launch_handler.js");
const { NavigateSplitbyIntentHandler } = require("./skill_handlers/splitby_handler.js");
const {
    EnableUserPreferenceIntentHandler, DisableUserPreferenceIntentHandler
} = require("./skill_handlers/user_preference_handler.js");

const { NavigateEmailIntentHandler } = require("./skill_handlers/email_handler.js");
const { add_to_APL_text_pager } = require("./utils/APL_utils.js");

const dynamoDBClient = new AWS.DynamoDB({
    apiVersion: "latest", region: process.env.REGION
});

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "AMAZON.HelpIntent";
    },
    async handle(handlerInput) {
        const speech_text = build_melvin_voice_response(
            build_ssml_response_from_nunjucks("system/help.njk"));
        const reprompt_text = build_melvin_voice_response(
            build_ssml_response_from_nunjucks("system/help_reprompt.njk"));
        add_to_APL_text_pager(handlerInput,
            "Check out our videos and sample conversations at https://pittgenomics.gitlab.io/melvin_docs");
        return handlerInput.responseBuilder
            .speak(speech_text)
            .reprompt(reprompt_text)
            .withShouldEndSession(false)
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
        const speech_text = build_melvin_voice_response(GOODBYE_SPEECH);
        return handlerInput.responseBuilder
            .speak(speech_text)
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

/*
 * The intent reflector is used for interaction model testing and debugging.
 * It will simply repeat the intent the user said. You can create custom handlers
 * for your intents by defining them above, then also adding them to the request
 * handler chain below.
 */
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest";
    },
    handle(handlerInput) {
        const intent_name = handlerInput.requestEnvelope.request.intent.name;
        console.info(`[IntentReflectorHandler] intent_name: ${intent_name}`);
        const speech_text = build_melvin_voice_response(
            build_ssml_response_from_nunjucks("system/reflector.njk"));
        const reprompt_text = build_melvin_voice_response(
            build_ssml_response_from_nunjucks("system/reflector_reprompt.njk"));

        return handlerInput.responseBuilder
            .speak(speech_text)
            .reprompt(reprompt_text)
            .getResponse();
    }
};



/* 
 * Generic error handling to capture any syntax or routing errors. If you receive an error
 * stating the request handler chain is not found, you have not implemented a handler for
 * the intent being invoked or included it in the skill builder below.
 */
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.error(`[ErrorHandler] ${error.message}`, error);
        const speech_text = build_melvin_voice_response(
            build_ssml_response_from_nunjucks("error/error_handler.njk"));
        const reprompt_text = build_melvin_voice_response(
            build_ssml_response_from_nunjucks("error/error_handler_reprompt.njk"));

        return handlerInput.responseBuilder
            .speak(speech_text)
            .reprompt(reprompt_text)
            .withShouldEndSession(false)
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

/*
 * This handler acts as the entry point for your skill, routing all request and response
 * payloads to the handlers above. Make sure any new handlers or interceptors you've
 * defined are included below. The order matters - they're processed top to bottom.
 */
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestInterceptors(RequestLogInterceptor)
    .addResponseInterceptors(ResponseLogInterceptor)
    .addRequestInterceptors(STSCredentialsInterceptor)
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
        NavigateEmailIntentHandler,

        // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
        IntentReflectorHandler)
    .addErrorHandlers(ErrorHandler)
    .withApiClient(new Alexa.DefaultApiClient())
    .withPersistenceAdapter(
        new ddbAdapter.DynamoDbPersistenceAdapter({
            tableName:      process.env.DYNAMODB_TABLE_USER_PREFERENCE,
            createTable:    false,
            dynamoDBClient: dynamoDBClient
        })
    )
    .lambda();