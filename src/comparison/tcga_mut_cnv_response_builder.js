const URL = require('url').URL;
const Speech = require('ssml-builder');
const _ = require('lodash');
const { add_to_APL_image_pager } = require('../utils/APL_utils.js');
const { round, add_query_params } = require('../utils/response_builder_utils.js');

const {
    MelvinAttributes,
    MelvinIntentErrors,
    melvin_error,
    DEFAULT_MELVIN_ERROR_SPEECH_TEXT,
    get_gene_speech_text,
    get_study_name_text,
    MELVIN_EXPLORER_ENDPOINT
} = require('../common.js');

const {
    get_mutations_tcga_stats,
    get_mutations_tcga_domain_stats
} = require('../http_clients/mutations_tcga_client.js');

const { get_cnvs_tcga_stats } = require('../http_clients/cnvs_tcga_client.js');


async function build_mut_cnv_compare_tcga_response(handlerInput, params, sate_diff) {
    const speech = new Speech();
    const image_list = [];
    const mut_response = await get_mutations_tcga_stats(params);
    const cnv_response = await get_cnvs_tcga_stats(params);

    if (!_.isEmpty(params[MelvinAttributes.GENE_NAME]) && _.isEmpty(params[MelvinAttributes.STUDY_ABBRV])) {
        const gene_text = get_gene_speech_text(params[MelvinAttributes.GENE_NAME]);
        const mut_cases = round(mut_response['data']['patient_percentage'], 1);
        const cna_perc = round(cnv_response['data']['records'][0]['cna_percentage'], 1);
        const cna_study_text = get_study_name_text(cnv_response['data']['records'][0]['study_abbreviation']);
        speech
            .say(`Across all of TCGA,`)
            .sayWithSSML(`${gene_text} is mutated in ${mut_cases} percent of all cases`)
            .say(`while having the greatest number of copy number alterations in`)
            .say(`${cna_study_text} at ${cna_perc}`);

        add_mut_cnvs_tcga_plot(image_list, params);


    } else if (!_.isEmpty(params[MelvinAttributes.GENE_NAME]) && !_.isEmpty(params[MelvinAttributes.STUDY_ABBRV])) {
        const gene_text = get_gene_speech_text(params[MelvinAttributes.GENE_NAME]);
        const study_text = get_study_name_text(params[MelvinAttributes.STUDY_ABBRV]);
        const mut_perc = round(mut_response['data']['patient_percentage'], 1);
        const cna_perc = round(cnv_response['data']['change_percentage'], 1);

        speech
            .sayWithSSML(`${gene_text} mutations are found in`)
            .say(`${mut_perc} percent of ${study_text} patients`)
            .say(`while ${cna_perc} percent of cases have copy number alterations`);

        add_mut_cnvs_tcga_plot(image_list, params);

    } else if (_.isEmpty(params[MelvinAttributes.GENE_NAME]) && !_.isEmpty(params[MelvinAttributes.STUDY_ABBRV])) {
        const study_text = get_study_name_text(params[MelvinAttributes.STUDY_ABBRV]);

        const mut_gene_text = get_gene_speech_text(Object.keys(mut_response['data'])[0]);
        const mut_gene_perc = round(mut_response['data'][Object.keys(mut_response['data'])[0]], 1);

        const cna_gene_text = get_gene_speech_text(cnv_response['data']['records'][0]['gene']);
        const cna_perc = round(cnv_response['data']['records'][0]['cna_percentage'], 1);

        speech
            .sayWithSSML(`Among ${study_text} patients, ${mut_gene_text}`)
            .say(`is the top mutated gene at ${mut_gene_perc},`)
            .sayWithSSML(`while ${cna_gene_text} has the greatest number of copy number alterations`)
            .say(`at ${cna_perc}`)

        add_mut_cnvs_tcga_plot(image_list, params);

    } else {
        throw melvin_error(
            `[build_mut_cnv_compare_tcga_response] invalid state: ${JSON.stringify(params)}`,
            MelvinIntentErrors.INVALID_STATE,
            DEFAULT_MELVIN_ERROR_SPEECH_TEXT
        );
    }

    add_to_APL_image_pager(handlerInput, image_list);
    return {
        'speech_text': speech.ssml()
    }
}

const add_mut_cnvs_tcga_plot = function (image_list, params) {
    const compare_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/comparison/tcga/mutations_cnv_plot`);
    add_query_params(compare_url, params);
    image_list.push(compare_url);
}

module.exports = {
    build_mut_cnv_compare_tcga_response
}