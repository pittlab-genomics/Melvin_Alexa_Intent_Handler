const URL = require('url').URL;
const Speech = require('ssml-builder');
const _ = require('lodash');

const {
    MelvinAttributes,
    MelvinIntentErrors,
    melvin_error,
    DEFAULT_MELVIN_ERROR_SPEECH_TEXT,
    CNVTypes,
    get_gene_speech_text,
    MELVIN_EXPLORER_ENDPOINT
} = require('../common.js');

const { get_cnvs_tcga_stats } = require('../http_clients/cnvs_tcga_client.js');
const { round, add_query_params } = require('../utils/response_builder_utils.js');

function build_cnv_alterations_response(params, response, speech) {
    const gene_speech_text = get_gene_speech_text(params[MelvinAttributes.GENE_NAME]);
    const study = params[MelvinAttributes.STUDY_NAME];

    if (params.cnv_change == CNVTypes.ALTERATIONS
        && response['data']['amplifications_percentage']
        && response['data']['deletions_percentage']) {

        const amplifications = round(response['data']['amplifications_percentage'], 1);
        const deletions = round(response['data']['deletions_percentage'], 1);
        speech
            .sayWithSSML(gene_speech_text)
            .say(`is amplified in ${amplifications} percent of ${study}`)
            .say(`patients while deleted in ${deletions} percent`);

    } else if (
        (params.cnv_change == CNVTypes.ALTERATIONS || params.cnv_change == CNVTypes.AMPLIFICATIONS)
        && response['data']['amplifications_percentage']
    ) {
        build_cnv_amplifications_response(params, response, speech)

    } else if (
        (params.cnv_change == CNVTypes.ALTERATIONS || params.cnv_change == CNVTypes.DELETIONS)
        && response['data']['deletions_percentage']
    ) {
        build_cnv_deletions_response(params, response, speech)

    } else {
        speech
            .say(`Sorry, I could not find copy number alterations data for ${study} in`)
            .sayWithSSML(gene_speech_text);
    }
}

function build_cnv_deletions_response(params, response, speech) {
    const deletions = round(response['data']['deletions_percentage'], 1);
    const gene_speech_text = get_gene_speech_text(params[MelvinAttributes.GENE_NAME]);
    const study = params[MelvinAttributes.STUDY_NAME];
    speech
        .sayWithSSML(gene_speech_text)
        .say(`is deleted in ${deletions} percent of ${study} patients`);

}

function build_cnv_amplifications_response(params, response, speech) {
    const amplifications = round(response['data']['amplifications_percentage'], 1);
    const gene_speech_text = get_gene_speech_text(params[MelvinAttributes.GENE_NAME]);
    const study = params[MelvinAttributes.STUDY_NAME];
    speech
        .sayWithSSML(gene_speech_text)
        .say(`is amplified in ${amplifications} percent of ${study} patients.`);
}

function build_cnv_by_study_response(params, response, speech) {
    const records_list = response['data']['records'];
    const study = params[MelvinAttributes.STUDY_NAME];

    if (Array.isArray(records_list)) {
        if (records_list.length > 2) {
            const gene_0_speech_text = get_gene_speech_text(records_list[0]['gene']);
            const gene_1_speech_text = get_gene_speech_text(records_list[1]['gene']);
            speech
                .sayWithSSML(`${gene_0_speech_text} and ${gene_1_speech_text}`)
                .say(`have the greatest number of copy number alterations in ${study} at`)
                .say(`${round(records_list[0]['cna_percentage'], 1)} percent and`)
                .say(`${round(records_list[0]['cna_percentage'], 1)} percent respectively`);

        } else if (records_list.length > 1) {
            const gene_0_speech_text = get_gene_speech_text(records_list[0]['gene']);
            speech
                .sayWithSSML(gene_0_speech_text)
                .say(`has the greatest number of copy number alterations in ${study} at`)
                .say(`${round(records_list[0]['cna_percentage'], 1)} percent`);

        } else if (records_list.length == 1) {
            const gene_0_speech_text = get_gene_speech_text(records_list[0]['gene']);
            speech
                .sayWithSSML(gene_0_speech_text)
                .say(`is the only gene that contains copy number alterations in ${study} at`)
                .say(`${round(records_list[0]['cna_percentage'], 1)} percent`);

        } else {
            speech.say('There were no copy number alterations found.');
        }

    } else {
        throw melvin_error(
            `[build_cnv_by_study_response] Invalid response from MELVIN_EXPLORER: ${JSON.stringify(response)}`,
            MelvinIntentErrors.INVALID_API_RESPOSE,
            `Sorry, I'm having trouble accessing copy number alteration records for ${study}`
        );
    }
}

async function build_cnvs_tcga_response(params) {
    const speech = new Speech();
    const image_list = [];
    const response = await get_cnvs_tcga_stats(params);

    if (_.isEmpty(params[MelvinAttributes.GENE_NAME]) && !_.isEmpty(params[MelvinAttributes.STUDY_NAME])) {
        add_cnvs_tcga_plot(image_list, params);
        build_cnv_by_study_response(params, response, speech);

    } else if (!_.isEmpty(params[MelvinAttributes.GENE_NAME]) && !_.isEmpty(params[MelvinAttributes.STUDY_NAME])) {
        add_cnvs_tcga_plot(image_list, params);
        build_cnv_alterations_response(params, response, speech);

    } else {
        throw melvin_error(
            `[build_cnvs_tcga_response] invalid state: ${JSON.stringify(params)}`,
            MelvinIntentErrors.INVALID_STATE,
            DEFAULT_MELVIN_ERROR_SPEECH_TEXT
        );
    }

    return {
        'speech_text': speech.ssml(),
        'image_list': image_list
    }
}

const add_cnvs_tcga_plot = function (image_list, params) {
    const cnv_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/cnvs/tcga/plot`);
    add_query_params(cnv_url, params);
    image_list.push(cnv_url);
}

module.exports = {
    build_cnvs_tcga_response
}