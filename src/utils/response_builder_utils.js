const _ = require('lodash');
const Speech = require('ssml-builder');

const {
    MelvinAttributes,
    MelvinIntentErrors,
    melvin_error,
    nunjucks_env,
    DEFAULT_INVALID_STATE_RESPONSE,
    DEFAULT_NOT_IMPLEMENTED_RESPONSE
} = require('../common.js');


const add_query_list_params = function (url, params, list) {
    list.forEach(function (item) {
        if (item in params) {
            url.searchParams.set(item, params[item]);
        }
    });
}

const add_query_params = function (url, params) {
    if (params[MelvinAttributes.GENE_NAME]) {
        url.searchParams.set('gene', params[MelvinAttributes.GENE_NAME]);
    }

    if (params[MelvinAttributes.STUDY_ABBRV]) {
        url.searchParams.set('study', params[MelvinAttributes.STUDY_ABBRV]);
    }
}

const get_state_change_diff = function (state_change) {
    const prev_s = state_change['prev_melvin_state'];
    const new_s = state_change['new_melvin_state'];
    const diff_s = {};
    console.debug(`[get_state_change_diff] state_change: ${JSON.stringify(state_change)}`);

    for (let [_ignore, value] of Object.entries(MelvinAttributes)) {
        let prev_val = _.get(prev_s, value, '');
        let new_val = _.get(new_s, value, '');
        // console.debug(`[get_state_change_diff] ${prev_val}, ${new_val}, ${value}`);
        if (new_val === '') {
            continue;
        }

        if (prev_val !== new_val) {
            diff_s['entity_type'] = value;
            diff_s['entity_value'] = new_val;
            break;
        }
    }

    console.debug(`[get_state_change_diff] diff_s: ${JSON.stringify(diff_s)}`);
    return diff_s;
}

const round = function (value, precision) {
    var multiplier = Math.pow(10, precision || 0);
    return Math.round(value * multiplier) / multiplier;
}


const build_ssml_response_from_nunjucks = function (nunjucks_template, nunjucks_context)  {
    const speech = new Speech();
    const nunjucks_res = nunjucks_env
        .render(nunjucks_template, nunjucks_context)
        .replace(/\r?\n|\r/g, " ")
        .replace(/\s+/g,' ')
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
    return speech.ssml()
}

module.exports = {
    round,
    add_query_params,
    add_query_list_params,
    get_state_change_diff,
    build_ssml_response_from_nunjucks
}