const URL = require('url').URL;
const Speech = require('ssml-builder');
const _ = require('lodash');
const { add_to_APL_image_pager } = require('../utils/APL_utils.js');

const {
    MelvinAttributes,
    MelvinIntentErrors,
    melvin_error,
    DEFAULT_MELVIN_ERROR_SPEECH_TEXT,
    CNVTypes,
    get_gene_speech_text,
    get_study_name_text,
    MELVIN_EXPLORER_ENDPOINT
} = require('../common.js');

const { get_cnvs_tcga_stats } = require('../http_clients/cnvs_tcga_client.js');
const { round, add_query_params } = require('../utils/response_builder_utils.js');

function build_cnv_alterations_response(params, response, speech) {
    const gene_speech_text = get_gene_speech_text(params[MelvinAttributes.GENE_NAME]);
    const study = get_study_name_text(params[MelvinAttributes.STUDY_ABBRV]);

    if (params.cnv_change == CNVTypes.ALTERATIONS
        && response['data']['amplifications_percentage']
        && response['data']['deletions_percentage']) {

        const amplifications = round(response['data']['amplifications_percentage'], 1);
        const deletions = round(response['data']['deletions_percentage'], 1);
        speech
            .say(`In ${study} patients,`)
            .sayWithSSML(gene_speech_text)
            .say(`is amplified ${amplifications} percent`)
            .say(`and deleted ${deletions} percent.`);

    } else if (
        params.cnv_change == CNVTypes.AMPLIFICATIONS && response['data']['amplifications_percentage']
    ) {
        build_cnv_amplifications_response(params, response, speech)

    } else if (
        params.cnv_change == CNVTypes.DELETIONS && response['data']['deletions_percentage']
    ) {
        build_cnv_deletions_response(params, response, speech)

    } else {
        speech
            .say(`I could not find any copy number alterations for ${study} in`)
            .sayWithSSML(gene_speech_text);
    }
}

function build_cnv_deletions_response(params, response, speech) {
    const deletions = round(response['data']['deletions_percentage'], 1);
    const gene_speech_text = get_gene_speech_text(params[MelvinAttributes.GENE_NAME]);
    const study = get_study_name_text(params[MelvinAttributes.STUDY_ABBRV]);
    speech
        .say(`In ${study} patients,`)
        .sayWithSSML(gene_speech_text)
        .say(`is deleted ${deletions} percent.`);

}

function build_cnv_amplifications_response(params, response, speech) {
    const amplifications = round(response['data']['amplifications_percentage'], 1);
    const gene_speech_text = get_gene_speech_text(params[MelvinAttributes.GENE_NAME]);
    const study = get_study_name_text(params[MelvinAttributes.STUDY_ABBRV]);
    speech
        .say(`In ${study} patients,`)
        .sayWithSSML(gene_speech_text)
        .say(`is amplified ${amplifications} percent.`);
}

function build_cnv_by_study_response(params, response, speech) {
    const records_list = response['data']['records'];
    const study = get_study_name_text(params[MelvinAttributes.STUDY_ABBRV]);

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
            speech.say(`I could not find copy number alterations for ${study}.`);
        }

    } else {
        throw melvin_error(
            `[build_cnv_by_study_response] Invalid response from MELVIN_EXPLORER: ${JSON.stringify(response)}`,
            MelvinIntentErrors.INVALID_API_RESPOSE,
            `Sorry, I'm having trouble accessing copy number alteration records for ${study}`
        );
    }
}

async function build_cnvs_tcga_response(handlerInput, params) {
    const speech = new Speech();
    const image_list = [];
    const response = await get_cnvs_tcga_stats(params);
    const study = get_study_name_text(params[MelvinAttributes.STUDY_ABBRV]);

    if (_.isEmpty(params[MelvinAttributes.GENE_NAME]) && !_.isEmpty(study)) {
        add_cnvs_tcga_plot(image_list, params);
        build_cnv_by_study_response(params, response, speech);

    } else if (!_.isEmpty(params[MelvinAttributes.GENE_NAME]) && !_.isEmpty(study)) {
        add_cnvs_tcga_plot(image_list, params);
        build_cnv_alterations_response(params, response, speech);

    } else {
        throw melvin_error(
            `[build_cnvs_tcga_response] invalid state: ${JSON.stringify(params)}`,
            MelvinIntentErrors.INVALID_STATE,
            DEFAULT_MELVIN_ERROR_SPEECH_TEXT
        );
    }

    add_to_APL_image_pager(handlerInput, image_list);
    return {
        'speech_text': speech.ssml()
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