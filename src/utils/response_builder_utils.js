const _ = require('lodash');

const {
    MelvinAttributes
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

    for (let [key, value] of Object.entries(MelvinAttributes)) {
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
    };

    console.debug(`[get_state_change_diff] diff_s: ${JSON.stringify(diff_s)}`);
    return diff_s;
}

const round = function (value, precision) {
    var multiplier = Math.pow(10, precision || 0);
    return Math.round(value * multiplier) / multiplier;
}

module.exports = {
    round,
    add_query_params,
    add_query_list_params,
    get_state_change_diff
}