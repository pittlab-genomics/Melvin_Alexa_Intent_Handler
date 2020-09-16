"use strict";

const AWS = require("aws-sdk");
const ses = new AWS.SES({ region: "eu-west-1" });

const fs = require("fs");
const util = require("util");
const moment = require("moment");
const _ = require("lodash");

const { MelvinEventTypes } = require("../common.js");
const utterances_doc = require("../dao/utterances.js");


const readFile = util.promisify(fs.readFile);
const ssml_regex = /(<([^>]+)>)/ig;

const sqs_irs_handler = async function (event, context, callback) {
    console.info(`[sqs_irs_handler] event: ${JSON.stringify(event)}, context: ${JSON.stringify(context)}`);
    const response = {
        statusCode: 200,
        body:       {
            message: "SQS event processed.",
            event:   event,
        },
    };

    try {
        await Promise.all(event["Records"].map(async (item) => {
            const msg_data = JSON.parse(item["body"]);
            process_message(msg_data);
        }));

        callback(null, response);

    } catch (error) {
        console.error("[sqs_irs_handler] error while sending email", error);
    }
};

async function process_message(msg_data) {
    console.info(`[process_message] processing msg_data: ${JSON.stringify(msg_data)}`);
    var date_str = moment(msg_data["timestamp"]).format("YYYY-MM-DD HH:mm Z");
    const sub_text = `Melvin results export on ${date_str}`;
    const body_part_text = "Hi Akila,\r\nPlease find your Melvin analyses data below.";
    const greeting_text = "Hi Akila, <br/><br/>Please find your Melvin analyses data below.<br/><br/>";

    let utterance_list = [];
    if (!_.isEmpty(msg_data["irs_duration_sec"])) {
        // TODO
    } else {
        utterance_list = await utterances_doc.get_last_n_events(
            msg_data["user_id"],
            msg_data["irs_results_count"],
            MelvinEventTypes.ANALYSIS_EVENT);
        utterance_list = utterance_list.slice(0, msg_data["irs_results_count"]);
        console.info(`[process_message] utterance_list.len: ${utterance_list.length}`);
    }

    const html_part_text = await get_utterances_html(greeting_text, utterance_list);
    await irs_send_email(sub_text, body_part_text, html_part_text);
}

async function get_utterances_html(greeting_text, utterance_list) {
    if (utterance_list.length == 0) {
        return "Sorry, I could not find any analyses.";
    }

    const html_template_content = await readFile(
        __dirname + "/../../resources/SES/irs_email_template.html", "utf8");

    let results_table_html = greeting_text;
    let counter = 1;
    for (const [i, item] of utterance_list.entries()) {
        let melvin_response = item["melvin_response"];
        let ssml_text = JSON.stringify(melvin_response["outputSpeech"]["ssml"]);
        let response_text = ssml_text.replace(ssml_regex, "");
        let apl_directives = melvin_response["directives"];
        if (!Array.isArray(apl_directives) || apl_directives.length == 0) {
            continue;
        }

        let image_properties = apl_directives[0]["datasources"]["pagerTemplateData"]["properties"];
        let params_text = apl_directives[0]["datasources"]["pagerTemplateData"]["footer_text"];

        results_table_html += `<tr><td style="padding: 20px 0 30px 0;">${counter}. ${params_text}</td></tr>\n`;
        results_table_html += `<tr><td style="padding: 20px 0 30px 0;">${response_text}</td></tr>\n`;
        counter += 1;

        for (let image_item in image_properties) {
            let image_url = image_properties[image_item]["URL"]["href"];
            results_table_html += "<tr><td style=\"padding: 20px 0 30px 0;\">\n";
            let image_element = `<img src="${image_url}" width="300" style="display:block;width:100%" alt="Image" />`;
            results_table_html += `<a href="${image_url}">${image_element}</a>\n`;
            results_table_html += "</td></tr>\n";
        }
        results_table_html += "<tr><td style=\"padding: 20px 0 30px 0;\"><hr/></td></tr>\n";
    }
    const html_data = html_template_content.toString().replace("_TEMPLATE_PLACEHOLDER_", results_table_html);
    console.info(`[sqs_irs_handler] get_utterances_html | html_data: ${html_data}`);
    return html_data;
}

async function irs_send_email(subjectText, bodyText, bodyHTML) {
    var payload = {
        Destination: { ToAddresses: [
            "ravihansa3000@hotmail.com"
        ]},
        Message: { /* required */
            Body: { /* required */
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
        Source: "csipav@nus.edu.sg",
        Tags:   [
            {
                Name:  "source", /* required */
                Value: "AWS" /* required */
            }
        ]
    };
    const response = await ses.sendEmail(payload).promise();
    console.info(`[irs_send_email] email sent | response: ${JSON.stringify(response)}`);
}

exports.handler = sqs_irs_handler;