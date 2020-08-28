const URL = require('url').URL;
const Speech = require('ssml-builder');
const _ = require('lodash');
const { add_to_APL_image_pager } = require('../utils/APL_utils.js');
const { add_query_params } = require('../utils/response_builder_utils.js');

const {
    MelvinAttributes,
    MelvinIntentErrors,
    melvin_error,
    DEFAULT_INVALID_STATE_RESPONSE,
    DEFAULT_NOT_IMPLEMENTED_RESPONSE,
    get_gene_speech_text,
    get_study_name_text,
    MELVIN_EXPLORER_ENDPOINT
} = require('../common.js');

const {
    get_mutations_clinvar_stats
} = require('../http_clients/mutations_clinvar_client.js');

function _populate_response(params, data, speech) {
    const pathogenic_count = data['pathogenic'];
    const likely_pathogenic_count = data['likely pathogenic'];
    const gene_speech_text = get_gene_speech_text(params[MelvinAttributes.GENE_NAME]);
    const study = get_study_name_text(params[MelvinAttributes.STUDY_ABBRV]);

    speech
        .say(`There are ${pathogenic_count} pathogenic and ${likely_pathogenic_count} likely pathogenic variants`)
        .sayWithSSML(`at ${gene_speech_text}`)
        .say(`in ${study}`);
}

async function build_mutations_clinvar_response(handlerInput, params) {
    const speech = new Speech();
    const image_list = [];
    const response = await get_mutations_clinvar_stats(params);

    if (!_.isEmpty(params[MelvinAttributes.GENE_NAME]) && _.isEmpty(params[MelvinAttributes.STUDY_ABBRV])) {
        speech.say(DEFAULT_NOT_IMPLEMENTED_RESPONSE);

    } else if (!_.isEmpty(params[MelvinAttributes.GENE_NAME]) && !_.isEmpty(params[MelvinAttributes.STUDY_ABBRV])) {
        const data = response['data'];
        add_mutations_clinvar_stats_plot(image_list, params);
        _populate_response(params, data, speech);

    } else if (_.isEmpty(params[MelvinAttributes.GENE_NAME]) && !_.isEmpty(params[MelvinAttributes.STUDY_ABBRV])) {
        speech.say(DEFAULT_NOT_IMPLEMENTED_RESPONSE);

    } else {
        throw melvin_error(
            `[build_mutations_tcga_response] invalid state: ${JSON.stringify(params)}`,
            MelvinIntentErrors.INVALID_STATE,
            DEFAULT_INVALID_STATE_RESPONSE
        );
    }

    add_to_APL_image_pager(handlerInput, image_list);
    return {
        'speech_text': speech.ssml()
    }
}

const add_mutations_clinvar_stats_plot = function (image_list, params) {
    const count_plot_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/clinvar/plot`);
    add_query_params(count_plot_url, params);
    image_list.push(count_plot_url);
}

module.exports = {
    build_mutations_clinvar_response
}
