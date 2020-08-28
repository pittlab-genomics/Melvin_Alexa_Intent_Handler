const URL = require('url').URL;
const Speech = require('ssml-builder');
const _ = require('lodash');
const { add_to_APL_image_pager } = require('../utils/APL_utils.js');

const {
    MelvinAttributes,
    MelvinIntentErrors,
    melvin_error,
    DEFAULT_INVALID_STATE_RESPONSE,
    CNATypes,
    get_gene_speech_text,
    get_study_name_text,
    MELVIN_EXPLORER_ENDPOINT
} = require('../common.js');

const { get_cna_tcga_stats } = require('../http_clients/cna_tcga_client.js');
const { round, add_query_params } = require('../utils/response_builder_utils.js');

function build_cna_alterations_response(params, response, speech) {
    const gene_speech_text = get_gene_speech_text(params[MelvinAttributes.GENE_NAME]);
    const study = get_study_name_text(params[MelvinAttributes.STUDY_ABBRV]);

    if (params.cna_change == CNATypes.ALTERATIONS
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
        params.cna_change == CNATypes.AMPLIFICATIONS && response['data']['amplifications_percentage']
    ) {
        build_cna_amplifications_response(params, response, speech)

    } else if (
        params.cna_change == CNATypes.DELETIONS && response['data']['deletions_percentage']
    ) {
        build_cna_deletions_response(params, response, speech)

    } else {
        speech
            .say(`I could not find any copy number alterations for ${study} in`)
            .sayWithSSML(gene_speech_text);
    }
}

function build_cna_deletions_response(params, response, speech) {
    const deletions = round(response['data']['deletions_percentage'], 1);
    const gene_speech_text = get_gene_speech_text(params[MelvinAttributes.GENE_NAME]);
    const study = get_study_name_text(params[MelvinAttributes.STUDY_ABBRV]);
    speech
        .say(`In ${study} patients,`)
        .sayWithSSML(gene_speech_text)
        .say(`is deleted ${deletions} percent.`);

}

function build_cna_amplifications_response(params, response, speech) {
    const amplifications = round(response['data']['amplifications_percentage'], 1);
    const gene_speech_text = get_gene_speech_text(params[MelvinAttributes.GENE_NAME]);
    const study = get_study_name_text(params[MelvinAttributes.STUDY_ABBRV]);
    speech
        .say(`In ${study} patients,`)
        .sayWithSSML(gene_speech_text)
        .say(`is amplified ${amplifications} percent.`);
}

function build_cna_by_gene_response(params, response, speech) {
    const records_list = response['data']['records'];
    const gene_text = get_gene_speech_text(params[MelvinAttributes.GENE_NAME]);

    if (Array.isArray(records_list)) {
        if (records_list.length > 2) {
            const study_0_text = get_study_name_text(records_list[0]['study_abbreviation']);
            const study_1_text = get_study_name_text(records_list[1]['study_abbreviation']);
            speech
                .sayWithSSML(`In ${gene_text} greatest number of copy number alterations`)
                .say(`are found in ${study_0_text} and ${study_1_text} patients`)
                .say(`at ${round(records_list[0]['cna_percentage'], 1)} percent and`)
                .say(`${round(records_list[1]['cna_percentage'], 1)} percent respectively`);

        } else if (records_list.length > 1) {
            const study_0_text = get_study_name_text(records_list[0]['study_abbreviation']);
            speech
                .sayWithSSML(`In ${gene_text} greatest number of copy number alterations`)
                .say(`are found in ${study_0_text} patients`)
                .say(`at ${round(records_list[0]['cna_percentage'], 1)} percent`);

        } else if (records_list.length == 1) {
            const study_0_text = get_study_name_text(records_list[0]['study_abbreviation']);
            speech
                .sayWithSSML(`In ${gene_text} copy number alterations`)
                .say(`are found only in ${study_0_text} patients`)
                .say(`at ${round(records_list[0]['cna_percentage'], 1)} percent`);

        } else {
            speech.say(`I could not find copy number alterations for ${gene_text}.`);
        }

    } else {
        throw melvin_error(
            `[build_cna_by_gene_response] Invalid response from MELVIN_EXPLORER: ${JSON.stringify(response)}`,
            MelvinIntentErrors.INVALID_API_RESPOSE,
            `Sorry, I'm having trouble accessing copy number alteration records for ${gene_text}`
        );
    }
}

function build_cna_by_study_response(params, response, speech) {
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
                .say(`${round(records_list[1]['cna_percentage'], 1)} percent respectively`);

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
            `[build_cna_by_study_response] Invalid response from MELVIN_EXPLORER: ${JSON.stringify(response)}`,
            MelvinIntentErrors.INVALID_API_RESPOSE,
            `Sorry, I'm having trouble accessing copy number alteration records for ${study}`
        );
    }
}

async function build_cna_tcga_response(handlerInput, params) {
    const speech = new Speech();
    const image_list = [];
    const response = await get_cna_tcga_stats(params);

    if (response['error']) {
        throw melvin_error(
            `[build_cna_compare_tcga_response] invalid response | response: ${JSON.stringify(response)}`,
            MelvinIntentErrors.INVALID_API_RESPOSE,
            "Sorry, there was a problem while performing the copy number alterations analysis. Please try again later."
        );
    }

    if (!_.isEmpty(params[MelvinAttributes.GENE_NAME]) && _.isEmpty(params[MelvinAttributes.STUDY_ABBRV])) {
        add_cna_tcga_plot(image_list, params);
        build_cna_by_gene_response(params, response, speech);

    } else if (_.isEmpty(params[MelvinAttributes.GENE_NAME]) && !_.isEmpty(params[MelvinAttributes.STUDY_ABBRV])) {
        add_cna_tcga_plot(image_list, params);
        build_cna_by_study_response(params, response, speech);

    } else if (!_.isEmpty(params[MelvinAttributes.GENE_NAME]) && !_.isEmpty(params[MelvinAttributes.STUDY_ABBRV])) {
        add_cna_tcga_plot(image_list, params);
        build_cna_alterations_response(params, response, speech);

    } else {
        throw melvin_error(
            `[build_cna_tcga_response] invalid state: ${JSON.stringify(params)}`,
            MelvinIntentErrors.INVALID_STATE,
            DEFAULT_INVALID_STATE_RESPONSE
        );
    }

    add_to_APL_image_pager(handlerInput, image_list);
    return {
        'speech_text': speech.ssml()
    }
}

async function build_cna_compare_tcga_response(handlerInput, params, compare_params, sate_diff) {
    const speech = new Speech();
    const image_list = [];
    const response = await get_cna_tcga_stats(params);
    const compare_response = await get_cna_tcga_stats(compare_params);

    if (response['error'] || compare_response['error']) {
        throw melvin_error(
            `[build_cna_compare_tcga_response] invalid response | response: ${JSON.stringify(response)}, `
            + `compare_response: ${JSON.stringify(compare_response)}`,
            MelvinIntentErrors.INVALID_API_RESPOSE,
            "Sorry, there was a problem while performing the comparison analysis. Please try again later."
        );
    }

    if (!_.isEmpty(params[MelvinAttributes.GENE_NAME]) && _.isEmpty(params[MelvinAttributes.STUDY_ABBRV])) {
        if (sate_diff['entity_type'] === MelvinAttributes.GENE_NAME) {
            const gene_text = get_gene_speech_text(params[MelvinAttributes.GENE_NAME]);
            const c_gene_text = get_gene_speech_text(compare_params[MelvinAttributes.GENE_NAME]);

            const study_text = get_study_name_text(response['data']['records'][0]['study_abbreviation']);
            const c_study_text = get_study_name_text(compare_response['data']['records'][0]['study_abbreviation']);

            const cna_perc = round(response['data']['records'][0]['cna_percentage'], 1);
            const c_cna_perc = round(compare_response['data']['records'][0]['cna_percentage'], 1);

            speech
                .sayWithSSML(`${gene_text} has the greatest number of copy number alterations`)
                .say(`in ${study_text} at ${cna_perc},`)
                .sayWithSSML(`while ${c_gene_text} has the greatest number of copy number alterations in`)
                .say(`${c_study_text} at ${c_cna_perc}`);

            add_cna_tcga_plot(image_list, params);
            add_cna_tcga_plot(image_list, compare_params);

        } else {
            throw melvin_error(
                `[build_cna_compare_tcga_response] invalid state: ${JSON.stringify(params)}`,
                MelvinIntentErrors.INVALID_STATE,
                "Sorry, I need a gene name to make a comparison."
            );
        }


    } else if (!_.isEmpty(params[MelvinAttributes.GENE_NAME]) && !_.isEmpty(params[MelvinAttributes.STUDY_ABBRV])) {
        const gene_text = get_gene_speech_text(params[MelvinAttributes.GENE_NAME]);
        const study_text = get_study_name_text(params[MelvinAttributes.STUDY_ABBRV]);

        const cna_perc = round(response['data']['change_percentage'], 1);
        const c_cna_perc = round(compare_response['data']['change_percentage'], 1);
        const freq_adj = (c_cna_perc > cna_perc) ? "more" : "less";

        if (sate_diff['entity_type'] === MelvinAttributes.GENE_NAME) {
            const c_gene_text = get_gene_speech_text(compare_params[MelvinAttributes.GENE_NAME]);
            speech
                .sayWithSSML(`${study_text} patients have ${freq_adj} copy number alterations`)
                .say(`in ${c_gene_text} at ${c_cna_perc} percent,`)
                .say(`while ${cna_perc} percent of cases have alterations in ${gene_text}.`);

        } else if (sate_diff['entity_type'] === MelvinAttributes.STUDY_ABBRV) {
            const c_study_text = get_study_name_text(compare_params[MelvinAttributes.STUDY_ABBRV]);
            speech
                .sayWithSSML(`${gene_text} has ${freq_adj} copy number alterations`)
                .say(`in ${c_study_text} at ${c_cna_perc} percent,`)
                .say(`while ${cna_perc} percent of ${study_text} cases have alterations.`);

        } else {
            throw melvin_error(
                `[build_cna_compare_tcga_response] invalid state: ${JSON.stringify(params)}`,
                MelvinIntentErrors.INVALID_STATE,
                "Sorry, something went wrong while performing the comparison analysis."
            );
        }

        add_cna_tcga_plot(image_list, params);
        add_cna_tcga_plot(image_list, compare_params);

    } else if (_.isEmpty(params[MelvinAttributes.GENE_NAME]) && !_.isEmpty(params[MelvinAttributes.STUDY_ABBRV])) {
        const study_text = get_study_name_text(params[MelvinAttributes.STUDY_ABBRV]);
        const c_study_text = get_study_name_text(compare_params[MelvinAttributes.STUDY_ABBRV]);

        const gene_text = get_gene_speech_text(response['data']['records'][0]['gene']);
        const c_gene_text = get_gene_speech_text(compare_response['data']['records'][0]['gene']);

        const cna_perc = round(response['data']['records'][0]['cna_percentage'], 1);
        const c_cna_perc = round(compare_response['data']['records'][0]['cna_percentage'], 1);

        speech
            .sayWithSSML(`Among ${study_text} patients, ${gene_text}`)
            .say(`has the greatest number of copy number alterations at ${cna_perc},`)
            .sayWithSSML(`while ${c_gene_text} has the greatest number of copy number alterations in ${c_study_text}`)
            .say(`at ${c_cna_perc}`);

        add_cna_tcga_plot(image_list, params);
        add_cna_tcga_plot(image_list, compare_params);

    } else {
        throw melvin_error(
            `[build_cna_compare_tcga_response] invalid state: ${JSON.stringify(params)}`,
            MelvinIntentErrors.INVALID_STATE,
            DEFAULT_INVALID_STATE_RESPONSE
        );
    }

    add_to_APL_image_pager(handlerInput, image_list);
    return {
        'speech_text': speech.ssml()
    }
}

const add_cna_tcga_plot = function (image_list, params) {
    const cna_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/cna/tcga/plot`);
    add_query_params(cna_url, params);
    image_list.push(cna_url);
}

module.exports = {
    build_cna_tcga_response,
    build_cna_compare_tcga_response
}