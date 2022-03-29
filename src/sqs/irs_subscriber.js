const AWS = require("aws-sdk");
const ses = new AWS.SES({ region: process.env.REGION });

const fs = require("fs");
const util = require("util");
const moment = require("moment");
const _ = require("lodash");

const {
    MelvinEventTypes,
    MAX_EMAIL_RESULT_COUNT,
    MAX_EMAIL_DURATION,
    MIN_EMAIL_RESULT_COUNT
} = require("../common.js");
const utterances_doc = require("../dao/utterances.js");


const readFile = util.promisify(fs.readFile);
const ssml_regex = /(<([^>]+)>)/ig;

const sqs_irs_handler = async function (event, context) {
    console.info(`[sqs_irs_handler] event: ${JSON.stringify(event, null, 4)}, context: ${JSON.stringify(context)}`);
    try {
        await Promise.all(event["Records"].map(async (item) => {
            console.info(`[sqs_irs_handler] item: ${JSON.stringify(item, null, 4)}`);
            const msg_data = JSON.parse(item["body"]);
            await process_message(msg_data);
        }));
    } catch (error) {
        console.error("[sqs_irs_handler] error while sending email", error);
        throw error;
    }
};

async function process_message(msg_data) {
    console.info(`[process_message] processing msg_data: ${JSON.stringify(msg_data)}`);
    const timestamp = _.get(msg_data, "timestamp", moment().valueOf());

    if (!_.has(msg_data, "user_id") || !_.has(msg_data, "user_email")
        || !_.has(msg_data, "session_id")) {
        throw new Error(`User context missing in message payload: ${JSON.stringify(msg_data)}`);
    }
    const date_str = moment(timestamp).format("YYYY-MM-DD HH:mm Z");
    const sub_text = `Melvin results export on ${date_str}`;
    const body_part_text = "Hi,\r\nPlease find your Melvin analyses data below.";
    const greeting_text = "Hi, <br/><br/>Please find your Melvin analyses data below.<br/><br/>";
    const user_email = msg_data["user_email"];

    let duration = MAX_EMAIL_DURATION;
    let count = _.get(msg_data, "irs_results_count", MIN_EMAIL_RESULT_COUNT);

    let utterance_list = [];
    if (_.has(msg_data, "irs_duration_sec")) {
        duration = Math.min(msg_data["irs_duration_sec"], MAX_EMAIL_DURATION);
        console.info(`[process_message] requested duration: ${duration}`);
        utterance_list = await utterances_doc.get_events_for_period(
            msg_data["user_id"],
            msg_data["session_id"],
            duration,
            MelvinEventTypes.ANALYSIS_EVENT,
            MAX_EMAIL_RESULT_COUNT);
    } else {
        count = Math.min(count, MAX_EMAIL_RESULT_COUNT);
        console.info(`[process_message] requested count: ${count}`);
        utterance_list = await utterances_doc.get_events_for_count(
            msg_data["user_id"],
            msg_data["session_id"],
            count,
            MelvinEventTypes.ANALYSIS_EVENT);
    }
    console.info(`[process_message] filtered utterances list size: ${utterance_list.length}`);
    const html_part_text = await get_utterances_html(greeting_text, utterance_list, count);
    await irs_send_email(user_email, sub_text, body_part_text, html_part_text);
}

async function get_utterances_html(greeting_text, utterance_list) {
    if (utterance_list.length == 0) {
        return "Sorry, I could not find any analyses performed for the given period.";
    }

    const html_template_content = await readFile(
        __dirname + "/../../resources/SES/irs_email_template.html", "utf8");

    let results_table_html = greeting_text;
    let counter = 1;
    for (let item of Object.values(utterance_list)) {
        let melvin_response = item["melvin_response"];
        let ssml_text = JSON.stringify(melvin_response["outputSpeech"]["ssml"]);
        let response_text = ssml_text.replace(ssml_regex, "");
        let apl_directives = melvin_response["directives"];
        let image_properties;
        let params_text;
        if (!Array.isArray(apl_directives) || apl_directives.length == 0) {
            let card = melvin_response["card"];
            if (card && card["image"]) {
                image_properties = { "image0": { "URL": card["image"]["largeImageUrl"] }};
                params_text = card["text"];
            } else {
                continue;
            }
        } else {
            if (apl_directives[0] && apl_directives[0]["datasources"]) {
                image_properties = apl_directives[0]["datasources"]["pagerTemplateData"]["properties"];
                params_text = apl_directives[0]["datasources"]["pagerTemplateData"]["footer_text"];
            } else {
                continue;
            }
        }

        results_table_html += `<tr><td style="padding: 20px 0 30px 0;">${counter}. ${params_text}</td></tr>\n`;
        results_table_html += `<tr><td style="padding: 20px 0 30px 0;">${response_text}</td></tr>\n`;

        for (let image_item in image_properties) {
            let image_url = image_properties[image_item]["URL"];
            results_table_html += "<tr><td style=\"padding: 20px 0 30px 0;\">\n";
            let image_element = `<img src="${image_url}" width="300" style="display:block;width:100%" alt="Image" />`;
            results_table_html += `<a href="${image_url}">${image_element}</a>\n`;
            results_table_html += "</td></tr>\n";
        }
        results_table_html += "<tr><td style=\"padding: 20px 0 30px 0;\"><hr/></td></tr>\n";
        counter += 1;
    }
    const html_data = html_template_content.toString().replace("_TEMPLATE_PLACEHOLDER_", results_table_html);
    console.info(`[sqs_irs_handler] html_data: ${html_data}`);
    return html_data;
}

async function irs_send_email(user_email, subjectText, bodyText, bodyHTML) {
    var payload = {
        Destination: { ToAddresses: [
            user_email
        ]},
        Message: {
            Body: {
                Html: {
                    Charset: "UTF-8",
                    Data:    bodyHTML
                },
                Text: {
                    Charset: "UTF-8",
                    Data:    bodyText
                }
            },
            Subject: {
                Charset: "UTF-8",
                Data:    subjectText
            }
        },
        Source: "no-reply@melvin.pittlabgenomics.com",
        Tags:   [
            {
                Name:  "source",
                Value: "AWS"
            }
        ]
    };
    const response = await ses.sendEmail(payload).promise();
    console.info(`[irs_send_email] email sent | response: ${JSON.stringify(response)}`);
}

exports.handler = sqs_irs_handler;