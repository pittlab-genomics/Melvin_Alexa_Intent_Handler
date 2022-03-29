
const _ = require("lodash");
const allSettled = require("promise.allsettled");
const moment = require("moment");
const AWS = require("aws-sdk");

const {
    MELVIN_WELCOME_GREETING,
    MELVIN_APP_NAME,
    WARMUP_SERVICE_ENABLED
} = require("../common.js");

const APLDocs = { welcome: require("../../resources/APL/welcome.json") };
const { supportsAPL } = require("../utils/APL_utils.js");
const sessions_doc = require("../dao/sessions.js");
const {
    build_ssml_response_from_nunjucks, build_melvin_voice_response 
} = require("../utils/response_builder_utils.js");
const { send_parallel_requests } = require("../warmup_service/warmup_service.js"); 


function add_launch_apl_docs(handlerInput) {
    const melvin_img_url = "https://melvin-public.s3-ap-southeast-1.amazonaws.com/en-US_largeIconUri.png";
    const melvin_logo_url = "https://melvin-public.s3-ap-southeast-1.amazonaws.com/en-US_smallIconUri.png";
    if (supportsAPL(handlerInput)) {
        handlerInput.responseBuilder.addDirective({
            type:        "Alexa.Presentation.APL.RenderDocument",
            token:       "welcomeToken",
            version:     "1.0",
            document:    APLDocs.welcome,
            datasources: { "bodyTemplate2Data": {
                "type":        "object",
                "objectId":    "bt2Sample",
                "title":       "Melvin",
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
                "imageContent": { "URL": melvin_img_url },
                "logoUrl":      melvin_logo_url,
                "hintText":     "Try, \"Alexa, tell me about TP53\""
            }},
        });

    } else {
        handlerInput.responseBuilder
            .withStandardCard(
                `Welcome to ${MELVIN_APP_NAME}`,
                "You can start with a gene, cancer type, or data type.",
                melvin_logo_url,
                melvin_img_url
            );
    }
}

async function update_warmup_cloudwatch_rule() {
    const cloudwatchevents = new AWS.CloudWatchEvents();
    const params = { Name: process.env.WARMUP_EVENT_RULE_NAME };

    try {
        const result = await cloudwatchevents.describeRule(params).promise();
        console.info(`[LaunchRequestHandler] warmup event rule: ${JSON.stringify(result)}`);
        const timestamp = moment().valueOf().toString();
        const description = `warmup service cloudwatch rule | last_updated: ${timestamp}`;
        const cloudwatchevent_params = {
            Name:               params.Name,
            Description:        description,
            ScheduleExpression: `rate(${process.env.WARMUP_EVENT_SCHEDULE_RATE})`,
            State:              "ENABLED"
        };
        const update_result = await cloudwatchevents.putRule(cloudwatchevent_params).promise();
        console.info(`[LaunchRequestHandler] update_cloudwatch_events | success: ${JSON.stringify(update_result)}`);

    } catch (err) {
        console.error(`[LaunchRequestHandler] update_cloudwatch_events | error: ${JSON.stringify(err)}`, err.stack);
    }
}

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "LaunchRequest";
    },
    async handle(handlerInput) {
        const async_tasks = [];
        const requestEnvelope = handlerInput.requestEnvelope;
        if (requestEnvelope.session.new) {
            console.info("[LaunchRequestHandler] Adding new session record...");
            const new_session_rec = {
                "user_id":       requestEnvelope.session.user.userId,
                "session_start": moment(requestEnvelope.request.timestamp).valueOf(),
                "session_id":    requestEnvelope.session.sessionId,
                "request":       requestEnvelope.request,
                "device":        requestEnvelope.context.System.device
            };
            async_tasks.push(sessions_doc.addUserSession(new_session_rec));
        }
        if (WARMUP_SERVICE_ENABLED) {
            // publish event to warmup queue in SQS which will be processed async via warmup service 
            async_tasks.push(update_warmup_cloudwatch_rule());

            /*
             Send the initial warmup request to external services since it takes a while for warmup service to kick in.
             We set a lower timeout to avoid Launch intent handler from getting stuck on network calls.
            */
            const warmup_opts = {
                verbose:         false,
                mapper_enabled:  true,
                mapper_timeout:  1500,
                stats_enabled:   true,
                stats_timeout:   1500,
                plots_enabled:   true,
                plots_timeout:   1500,
                splitby_enabled: false,
            };
            async_tasks.push(send_parallel_requests(requestEnvelope.request.requestId, warmup_opts));
        } else {
            console.info("[launch_handler] warmup service feature is disabled");
        }

        async_tasks.push(handlerInput.attributesManager.getPersistentAttributes());
        const task_results = await allSettled(async_tasks);
        console.info(`[launch_handler] task_results: ${JSON.stringify(task_results)}`);

        const preferences = task_results.slice(-1)[0]["value"];
        const brief_mode_preference = _.has(preferences, "BRIEF_MODE") ? preferences["BRIEF_MODE"] : false;
        const opts = { "BRIEF_MODE": brief_mode_preference };

        const nunjucks_context = { greeting: MELVIN_WELCOME_GREETING };
        const speech_ssml = build_melvin_voice_response(
            build_ssml_response_from_nunjucks("system/welcome.njk", nunjucks_context, opts));
        const reprompt_text = build_melvin_voice_response(
            build_ssml_response_from_nunjucks("system/welcome_reprompt.njk", nunjucks_context, opts));
        add_launch_apl_docs(handlerInput);
        return handlerInput.responseBuilder
            .speak(speech_ssml)
            .reprompt(reprompt_text)
            .withShouldEndSession(false)
            .getResponse();
    }
};

module.exports = { LaunchRequestHandler };