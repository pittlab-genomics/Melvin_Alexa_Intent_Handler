const _ = require("lodash");
const moment = require("moment");
const {
    parse, toSeconds
} = require("iso8601-duration");
const AWS = require("aws-sdk");
const sqs = new AWS.SQS({ region: process.env.REGION });

const {
    DEFAULT_ERROR_REPROMPT,
    EMAIL_ERROR,
    EMAIL_PERMISSION_ERROR,
    EMAIL_SUCCESS_RANGE,
    EMAIL_SUCCESS_COUNT,
    EMAIL_SUCCESS_REPROMPT
} = require("../common.js");

const { build_melvin_voice_response } = require("../utils/response_builder_utils.js");
const { add_to_APL_text_pager } = require("../utils/APL_utils.js");

const NavigateEmailIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "NavigateEmailIntent";
    },
    async handle(handlerInput) {
        const DEFAULT_RESULT_COUNT = 1;
        const queue_url = get_irs_queue_url();

        let speech_text = "";
        let reprompt_text = "";
        let msg_data = null;

        try {
            let user_email = "";
            if (process.env.IS_LOCAL) {
                user_email = process.env.MELVIN_USER_PROFILE_EMAIL;
            } else {
                user_email = await handlerInput.serviceClientFactory.getUpsServiceClient().getProfileEmail();
            }
            
            const timestamp = moment().valueOf();
            const user_id = _.get(handlerInput, "requestEnvelope.session.user.userId");
            const session_id = _.get(handlerInput, "requestEnvelope.session.sessionId");

            // AWS SQS message data
            msg_data = {
                "irs_channel": "EMAIL",
                "timestamp":   timestamp,
                "user_id":     user_id,
                "session_id":  session_id,
                "user_email":  user_email
            };

            const results_count = _.get(handlerInput, "requestEnvelope.request.intent.slots.count.value",
                DEFAULT_RESULT_COUNT);
            const results_duration = _.get(handlerInput, "requestEnvelope.request.intent.slots.duration.value");

            if (!_.isEmpty(results_duration)) {
                const duration_sec = toSeconds(parse(results_duration));
                msg_data["irs_duration_sec"] = duration_sec;
                console.info(`[NavigateEmailIntentHandler] publishing to ${queue_url}, `
                    + `msg_data: ${JSON.stringify(msg_data)}`);
                speech_text = build_melvin_voice_response(EMAIL_SUCCESS_RANGE);
            } else {
                msg_data["irs_results_count"] = results_count;
                console.info(`[NavigateEmailIntentHandler] publishing to ${queue_url}, `
                    + `msg_data: ${JSON.stringify(msg_data)}`);
                speech_text = build_melvin_voice_response(EMAIL_SUCCESS_COUNT);
            }
            reprompt_text = build_melvin_voice_response(EMAIL_SUCCESS_REPROMPT);
        } catch (error) {
            if (error.statusCode === 403) {
                speech_text = build_melvin_voice_response(EMAIL_PERMISSION_ERROR);
                return handlerInput.responseBuilder
                    .speak(speech_text)
                    .reprompt(speech_text)
                    .withAskForPermissionsConsentCard(["alexa::profile:email:read"])
                    .getResponse();
            }
            else {
                speech_text = build_melvin_voice_response(_.get(error, "speech", EMAIL_ERROR));
                reprompt_text = build_melvin_voice_response(DEFAULT_ERROR_REPROMPT);
                add_to_APL_text_pager(handlerInput, "");
                console.error(`[NavigateEmailIntentHandler] error: ${error.message}`, error);
            }
        }

        // publish IRS message to AWS SQS
        if (msg_data != null) {
            await publish_irs_message(JSON.stringify(msg_data), queue_url);
        }

        return handlerInput.responseBuilder
            .speak(speech_text)
            .reprompt(reprompt_text)
            .withShouldEndSession(false)
            .getResponse();
    }
};

function get_irs_queue_url() {
    const aws_region = process.env.REGION;
    const aws_account_id = process.env.AWS_ACCOUNT_ID;
    const service_name = process.env.SQS_IRS;
    const queue_url = `https://sqs.${aws_region}.amazonaws.com/${aws_account_id}/${service_name}`;
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