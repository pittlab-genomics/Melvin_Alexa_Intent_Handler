const AWS = require("aws-sdk");
const sqs = new AWS.SQS({ region: "eu-west-1", });


const Speech = require("ssml-builder");
const _ = require("lodash");
const moment = require("moment");

const {
    parse, toSeconds 
} = require("iso8601-duration");

const {
    MelvinAttributes,
    MelvinExplorerErrors,
    DataTypes,
    DEFAULT_GENERIC_ERROR_SPEECH_TEXT
} = require("../common.js");

const {
    validate_navigation_intent_state,
    update_melvin_state
} = require("../utils/navigation_utils.js");


const NavigateEmailIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "NavigateEmailIntent";
    },
    async handle(handlerInput) {
        let speechText = "";
        let repromptText = "";
        const DEFAULT_RESULT_COUNT = 1;

        try {
            // const state_change = await update_melvin_state(handlerInput);
            // validate_navigation_intent_state(handlerInput, state_change);

            const queue_url = get_irs_queue_url();
            const timestamp = moment().valueOf();
            const user_id = handlerInput.requestEnvelope.session.user.userId;

            // AWS SQS message data
            const msg_data = {
                "irs_channel": "EMAIL",
                "timestamp":   timestamp,
                "user_id":     user_id
            };

            const results_count = _.get(handlerInput, "requestEnvelope.request.intent.slots.count.value", DEFAULT_RESULT_COUNT);
            const results_duration = _.get(handlerInput, "requestEnvelope.request.intent.slots.duration.value");

            if (!_.isEmpty(results_duration)) {
                const duration_sec = toSeconds(parse(results_duration));
                msg_data["irs_duration_sec"] = duration_sec;
                console.log(`[NavigateEmailIntentHandler] publishing to ${queue_url} msg_data: ${JSON.stringify(msg_data)}`);
                speechText = "Ok, I'm emailing results during that period.";

            } else {
                msg_data["irs_results_count"] = results_count;
                console.log(`[NavigateEmailIntentHandler] publishing to ${queue_url} msg_data: ${JSON.stringify(msg_data)}`);

                if (results_count == DEFAULT_RESULT_COUNT) {
                    speechText = "Ok, I'm emailing that to you now.";
                } else {
                    speechText = `Ok, I'm emailing last ${results_count} results to you now.`;
                }
            }
            repromptText = "Please check your inbox in a while.";

            // publish IRS message to AWS SQS
            await publish_irs_message(JSON.stringify(msg_data), queue_url);

        } catch (error) {
            if (error["speech"]) {
                repromptText = speechText = error["speech"];
            } else {
                repromptText = speechText = "Something went wrong while sending the results. Please try again later.";
            }
            console.error("Error in NavigateEmailIntent", error);
        }

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(repromptText)
            .getResponse();
    }
};

function get_irs_queue_url() {
    const sqs_irs_ep = process.env.SQS_IRS.split(":");
    const account_id = sqs_irs_ep[0];
    const service_name = sqs_irs_ep[1];
    const queue_url = `https://sqs.eu-west-1.amazonaws.com/${account_id}/${service_name}`;
    return queue_url;
}

async function publish_irs_message(msg_str, queue_url) {
    const payload = {
        MessageBody: msg_str,
        QueueUrl:    queue_url,
    };

    const response = await sqs.sendMessage(payload).promise();
    console.info(`[publish_irs_message] message published | payload: ${JSON.stringify(payload)}, `
        + `response: ${JSON.stringify(response)}`);
}

module.exports = { NavigateEmailIntentHandler };