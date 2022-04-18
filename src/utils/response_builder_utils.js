const _ = require("lodash");
const fs = require("fs");
var path = require("path");
const Speech = require("ssml-builder");

const {
    MelvinAttributes,
    MelvinIntentErrors,
    melvin_error,
    nunjucks_env,
    RESPONSE_TEMPLATES_PATH,
    DEFAULT_INVALID_STATE_RESPONSE,
    DEFAULT_NOT_IMPLEMENTED_RESPONSE
} = require("../common.js");


const add_query_list_params = function (url, params, list) {
    list.forEach(function (item) {
        if (item in params) {
            url.searchParams.set(item, params[item]);
        }
    });
};

const add_query_params = function (url, params) {
    let result = {};
    if (params[MelvinAttributes.GENE_NAME]) {
        url.searchParams.set("gene", params[MelvinAttributes.GENE_NAME]);
        result.gene = params[MelvinAttributes.GENE_NAME];
    }

    if (params[MelvinAttributes.STUDY_ABBRV]) {
        url.searchParams.set("study", params[MelvinAttributes.STUDY_ABBRV]);
        result.study = params[MelvinAttributes.STUDY_ABBRV];
    }
    return result;

};

const get_state_change_diff = function (state_change) {
    const prev_s = state_change["prev_state"];
    const new_s = state_change["updated_state"];
    const diff_s = {};
    console.debug(`[get_state_change_diff] state_change: ${JSON.stringify(state_change)}`);

    for (let value of Object.values(MelvinAttributes)) {
        let prev_val = _.get(prev_s, value, "");
        let new_val = _.get(new_s, value, "");
        if (new_val === "") {
            continue;
        }

        if (prev_val !== new_val) {
            diff_s["entity_type"] = value;
            diff_s["entity_value"] = new_val;
            break;
        }
    }

    console.debug(`[get_state_change_diff] diff_s: ${JSON.stringify(diff_s)}`);
    return diff_s;
};

const round = function (value, precision) {
    var multiplier = Math.pow(10, precision || 0);
    return Math.round(value * multiplier) / multiplier;
};


const build_ssml_response_from_nunjucks = function (nunjucks_template, nunjucks_context = {}, opts = {}) {
    const speech = new Speech();
    if (_.get(opts, "BRIEF_MODE", false)) {
        const brief_template = nunjucks_template.substring(0, nunjucks_template.lastIndexOf(".")) + "_brief.njk";
        const brief_template_path = path.join(RESPONSE_TEMPLATES_PATH, brief_template);
        if (fs.existsSync(brief_template_path)) {
            console.info(`[build_ssml_response_from_nunjucks] brief mode template found: ${brief_template}`);
            nunjucks_template = brief_template;
        }
    }
    const nunjucks_res = nunjucks_env
        .render(nunjucks_template, nunjucks_context)
        .replace(/\r?\n|\r/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    console.debug(`[build_ssml_response_from_nunjucks] nunjucks_template: ${nunjucks_template}, ` +
        `nunjucks_res: ${nunjucks_res}`);

    if (nunjucks_res === MelvinIntentErrors.INVALID_STATE) {
        throw melvin_error(
            `invalid state | nunjucks_context: ${JSON.stringify(nunjucks_context)}`,
            MelvinIntentErrors.INVALID_STATE,
            DEFAULT_INVALID_STATE_RESPONSE
        );
    } else if (nunjucks_res === MelvinIntentErrors.NOT_IMPLEMENTED) {
        throw melvin_error(
            `not implemented | nunjucks_context: ${JSON.stringify(nunjucks_context)}`,
            MelvinIntentErrors.NOT_IMPLEMENTED,
            DEFAULT_NOT_IMPLEMENTED_RESPONSE
        );
    }
    speech.sayWithSSML(nunjucks_res);
    return speech;
};

const build_text_speech_and_reprompt_response = function (speech, opts = {}) {
    let speech_text = build_melvin_voice_response(speech.ssml(true), opts);
    let reprompt_text = "";
    if (_.get(opts, "BRIEF_MODE", false)) {
        reprompt_text = build_melvin_voice_response("What else?", opts);
    } else {
        speech.pause("300ms");
        speech.say("What else?");
        speech_text = build_melvin_voice_response(speech.ssml(true), opts);
        reprompt_text = build_melvin_voice_response(speech.ssml(true), opts);
    }
    return {
        "speech_text":   speech_text,
        "reprompt_text": reprompt_text
    };
};

const build_melvin_voice_response = function (speech, opts) {
    const style_enabled = _.get(opts, "ENABLE_VOICE_STYLE", false);
    const speech_text = speech instanceof Speech ? speech.ssml(true) : speech;
    let voice_text = speech_text;
    if (style_enabled) {
        voice_text = `<amazon:domain name="conversational">${speech_text}</amazon:domain>`;
    }
    return `<speak><voice name="Joanna">${voice_text}</voice></speak>`;
};

const call_directive_service = async function (handlerInput, speech) {
    const directiveServiceClient = handlerInput.serviceClientFactory.getDirectiveServiceClient();
    const requestEnvelope = handlerInput.requestEnvelope;
    const requestId = requestEnvelope.request.requestId;
    const endpoint = requestEnvelope.context.System.apiEndpoint;
    const token = requestEnvelope.context.System.apiAccessToken;
    const directive = {
        header:    { requestId: requestId },
        directive: {
            type:   "VoicePlayer.Speak",
            speech: speech
        }
    };
    return directiveServiceClient.enqueue(directive, endpoint, token);
};

module.exports = {
    round,
    add_query_params,
    add_query_list_params,
    get_state_change_diff,
    build_ssml_response_from_nunjucks,
    build_text_speech_and_reprompt_response,
    build_melvin_voice_response,
    call_directive_service
};