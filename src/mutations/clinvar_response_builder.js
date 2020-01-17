const URL = require('url').URL;
const Speech = require('ssml-builder');
const _ = require('lodash');

const { round, add_query_params } = require('../utils/response_builder_utils.js');

const {
    MelvinAttributes,
    MelvinIntentErrors,
    melvin_error,
    DEFAULT_MELVIN_ERROR_SPEECH_TEXT,
    DEFAULT_MELVIN_NOT_IMPLEMENTED_RESPONSE,
    get_gene_speech_text,
    MELVIN_EXPLORER_ENDPOINT
} = require('../common.js');

const {
    get_mutations_clinvar_stats
} = require('../http_clients/mutations_clinvar_client.js');

function _populate_response(params, data, speech) {
    const pathogenic_count = data['pathogenic'];
    const likely_pathogenic_count = data['likely pathogenic'];
    const gene_speech_text = get_gene_speech_text(params[MelvinAttributes.GENE_NAME]);

    speech
        .say(`There are ${pathogenic_count} pathogenic and ${likely_pathogenic_count} likely pathogenic variants`)
        .sayWithSSML(`at ${gene_speech_text}`)
        .say(`in ${params[MelvinAttributes.STUDY_NAME]}`);
}

async function build_mutations_clinvar_response(params) {
    const speech = new Speech();
    const image_list = [];
    const response = await get_mutations_clinvar_stats(params);

    if (!_.isEmpty(params[MelvinAttributes.GENE_NAME]) && _.isEmpty(params[MelvinAttributes.STUDY_NAME])) {
        speech.say(DEFAULT_MELVIN_NOT_IMPLEMENTED_RESPONSE);

    } else if (!_.isEmpty(params[MelvinAttributes.GENE_NAME]) && !_.isEmpty(params[MelvinAttributes.STUDY_NAME])) {
        const data = response['data'];
        add_mutations_clinvar_stats_plot(image_list, params);
        _populate_response(params, data, speech);

    } else if (_.isEmpty(params[MelvinAttributes.GENE_NAME]) && !_.isEmpty(params[MelvinAttributes.STUDY_NAME])) {
        speech.say(DEFAULT_MELVIN_NOT_IMPLEMENTED_RESPONSE);

    } else {
        throw melvin_error(
            `[build_mutations_tcga_response] invalid state: ${JSON.stringify(params)}`,
            MelvinIntentErrors.INVALID_STATE,
            DEFAULT_MELVIN_ERROR_SPEECH_TEXT
        );
    }

    return {
        'speech_text': speech.ssml(),
        'image_list': image_list
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
