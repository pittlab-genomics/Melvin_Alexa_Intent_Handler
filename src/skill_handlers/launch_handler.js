
const AWS = require("aws-sdk");
const moment = require("moment");
const _ = require("lodash");

const {
    MELVIN_WELCOME_GREETING,
    MELVIN_APP_NAME,
    STAGE 
} = require("../common.js");

const APLDocs = { welcome: require("../../resources/APL/welcome.json") };
const { supportsAPL } = require("../utils/APL_utils.js");
const sessions_doc = require("../dao/sessions.js");

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
                "You can start with a gene or cancer type.",
                melvin_logo_url,
                melvin_img_url
            );
    }
}

async function update_cloudwatch_events() {
    const cloudwatchevents = new AWS.CloudWatchEvents();
    var params = {
        NamePrefix: "melvin",
        Limit:      10,
    };

    try {
        const list_result = await cloudwatchevents.listRules(params).promise();
        console.log(`[LaunchRequestHandler] listRules | success: ${JSON.stringify(list_result)}`);

        const rule_list = list_result["Rules"];
        let warmup_rule_name = null;
        for (const rule_item of rule_list) {
            console.log(`[LaunchRequestHandler] rule_item | success: ${JSON.stringify(rule_item)}`);
            var tag_params = { ResourceARN: rule_item["Arn"] };
            const tag_result = await cloudwatchevents.listTagsForResource(tag_params).promise();
            console.log(`[LaunchRequestHandler] tag_result | success: ${JSON.stringify(tag_result)}`);
            const tag_list = tag_result["Tags"];
            for (const tag_item of tag_list) {
                if (tag_item["Key"] === "label" && tag_item["Value"] === process.env.WARMUP_RULE_LABEL) {
                    warmup_rule_name = rule_item["Name"];
                }
            }
        }
        
        if (!_.isEmpty(warmup_rule_name)) {
            const timestamp = moment().valueOf().toString();
            const description = "warmup service cloudwatch rule | " + 
                `stage: ${STAGE}, last_updated: ${timestamp}`;
            const cloudwatchevent_params = {
                Name:               warmup_rule_name,
                Description:        description,
                ScheduleExpression: "rate(5 minutes)",
                State:              "ENABLED",
                Tags:               [
                    {
                        Key:   "last_updated",
                        Value: timestamp
                    }
                ]
            };
            const update_result = await cloudwatchevents.putRule(cloudwatchevent_params).promise();
            console.log(`[LaunchRequestHandler] putRule | success: ${JSON.stringify(update_result)}`);
        } else {
            console.log("[LaunchRequestHandler] failed to find warmup event rule");
        }
    } catch(err) {
        console.log(`[LaunchRequestHandler] event error: ${JSON.stringify(err)}`, err.stack);
    }
}

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "LaunchRequest";
    },
    async handle(handlerInput) {
        if (handlerInput.requestEnvelope.session.new) {
            const new_session_rec = {
                "user_id":       handlerInput.requestEnvelope.session.user.userId,
                "session_start": moment(handlerInput.requestEnvelope.request.timestamp).valueOf(),
                "session_id":    handlerInput.requestEnvelope.session.sessionId,
                "request":       handlerInput.requestEnvelope.request,
                "device":        handlerInput.requestEnvelope.context.System.device
            };
            await sessions_doc.addUserSession(new_session_rec);
        }
        await update_cloudwatch_events();        

        const speechText = MELVIN_WELCOME_GREETING + 
            " Melvin Alexa skill is a voice based genomics analytics tool. " +
            " You can ask me about a gene or cancer type. " +
            " For more informaton, say help. Now, What would you like to know? ";
        const reprompt_text = "What would you like to know? You can ask me about a gene or cancer type.";
        add_launch_apl_docs(handlerInput);
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(reprompt_text)
            .getResponse();
    }
};

module.exports = { LaunchRequestHandler };