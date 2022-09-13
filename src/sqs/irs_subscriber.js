const AWS = require("aws-sdk");
const ses = new AWS.SES({ region: process.env.REGION });

const fs = require("fs");
const util = require("util");
const moment = require("moment");
const _ = require("lodash");
const fetch = require("node-fetch");
const mimemessage = require("mimemessage");

const {
    MelvinEventTypes,
    MAX_EMAIL_RESULT_COUNT,
    MAX_EMAIL_DURATION,
    MIN_EMAIL_RESULT_COUNT,
    MELVIN_EXPLORER_REGION,
    MELVIN_API_INVOKE_ROLE
} = require("../common.js");
const utterances_doc = require("../dao/utterances.js");
const {
    sign_request_with_creds, build_presigned_url, assume_role
} = require("../utils/sigv4_utils");


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
    const body_part_text = "Hi,\r\nPlease find the results of your Melvin Genomics analyses below.\r\n\r\n";
    const greeting_text = "Hi, <br/><br/>Please find the results of your Melvin Genomics analyses below.<br/><br/>";
    const user_email = msg_data["user_email"];
    const creds = await assume_role(MELVIN_API_INVOKE_ROLE, user_email);

    let duration = MAX_EMAIL_DURATION;
    const irs_results_count = _.get(msg_data, "irs_results_count", 0);
    const count = Math.min(Math.max(irs_results_count, MIN_EMAIL_RESULT_COUNT), MAX_EMAIL_RESULT_COUNT);

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
        console.info(`[process_message] requested count: ${count}`);
        utterance_list = await utterances_doc.get_events_for_count(
            msg_data["user_id"],
            msg_data["session_id"],
            count,
            MelvinEventTypes.ANALYSIS_EVENT);
    }
    console.info(`[process_message] filtered utterances list size: ${utterance_list.length}`);
    console.debug(`[process_message] filtered utterances: ${JSON.stringify(utterance_list)}`);
    const email_content = await get_utterances_html(greeting_text, utterance_list, creds);
    await irs_send_email(user_email, sub_text, body_part_text, email_content.html_part_text, email_content.attachments);
}

async function get_utterances_html(greeting_text, utterance_list, creds) {
    const attachments = [];
    if (utterance_list.length == 0) {
        return {
            "html_part_text": "Sorry, I could not find any analyses performed for the given period.",
            "attachments":    attachments
        };
    }

    const html_template_content = await readFile(
        __dirname + "/../../resources/SES/irs_email_template.html", "utf8");


    let results_table_html = greeting_text;
    for (const [utt_index, item] of Object.entries(utterance_list)) {
        let apl_image_urls = item["apl_image_urls"];
        if (!(apl_image_urls instanceof Array)) {
            continue;
        }

        let melvin_response = item["melvin_response"];
        let ssml_text = JSON.stringify(melvin_response["outputSpeech"]["ssml"]);
        let response_text = ssml_text.replace(ssml_regex, "");
        let params_text = JSON.stringify(item["melvin_state"]);

        results_table_html += `<tr><td style="padding: 20px 0 30px 0;">${utt_index + 1}. ${params_text}</td></tr>\n`;
        results_table_html += `<tr><td style="padding: 20px 0 30px 0;">${response_text}</td></tr>\n`;

        for (const [utt_img_index, image_url_str] of Object.entries(apl_image_urls)) {
            let image_url = new URL(image_url_str);
            const signed_req = await sign_request_with_creds(image_url, MELVIN_EXPLORER_REGION, creds, true);
            const presigned_url = build_presigned_url(signed_req);

            let response = await fetch(presigned_url);
            let img_buffer = await response.arrayBuffer();
            let enccoded_img_data = Buffer.from(img_buffer).toString("base64");
            attachments.push({
                "filename":      `${utt_index}_${utt_img_index}.png`,
                "content":       enccoded_img_data,
                "presigned_url": presigned_url
            });

            results_table_html += "<tr><td style=\"padding: 20px 0 30px 0;\">\n";
            let image_element = `<img src="${presigned_url}" width="300" ` +
                "style=\"display:block;width:100%\" alt=\"Image\" />";
            results_table_html += `<a href="${presigned_url}">${image_element}</a>\n`;
            results_table_html += "</td></tr>\n";
        }
    }
    results_table_html += "<tr><td style=\"padding: 20px 0 30px 0;\"><hr/></td></tr>\n";

    const html_data = html_template_content.toString().replace("_TEMPLATE_PLACEHOLDER_", results_table_html);
    const attachments_logs = attachments.map(e => { e.filename, e.presigned_url; });
    console.info(`[sqs_irs_handler] html_data: ${html_data}, attachments: ${JSON.stringify(attachments_logs)}`);
    return {
        "html_part_text": html_data,
        "attachments":    attachments
    };
}

async function irs_send_email(user_email, subjectText, bodyText, bodyHTML, attachment_list) {
    const mailContent = mimemessage.factory({
        contentType: "multipart/mixed", body: []
    });
    mailContent.header("From", "Melvin Genomics Results <no-reply@melvin.pittlabgenomics.com>");
    mailContent.header("To", user_email);
    mailContent.header("Subject", subjectText);

    const alternateEntity = mimemessage.factory({
        contentType: "multipart/alternate",
        body:        []
    });

    const plainEntity = mimemessage.factory({ body: bodyText });
    alternateEntity.body.push(plainEntity);

    const htmlEntity = mimemessage.factory({
        contentType: "text/html; charset=utf-8",
        body:        bodyHTML
    });
    alternateEntity.body.push(htmlEntity);

    for (const [key, attachment] of Object.entries(attachment_list)) {
        console.debug(`[irs_send_email] attachment: ${key}`);
        let attachmentEntity = mimemessage.factory(
            {
                contentType:             "image/png",
                contentTransferEncoding: "base64",
                body:                    attachment.content
            });
        attachmentEntity.header("Content-Disposition", `attachment; filename="${attachment.filename}"`);
        mailContent.body.push(attachmentEntity);
    }

    mailContent.body.push(alternateEntity);
    const mail_content = Buffer.from(mailContent.toString());
    console.info(`[irs_send_email] sending mail_content: ${mail_content}`);
    try {
        const ses_result = await ses.sendRawEmail({ RawMessage: { Data: mail_content }}).promise();
        console.info(`[irs_send_email] email sent | response: ${JSON.stringify(ses_result)}`);
    } catch (error) {
        console.error("[irs_send_email] failed to send email", error);
    }
}

exports.handler = sqs_irs_handler;