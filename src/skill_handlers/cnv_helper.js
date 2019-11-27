const Speech = require('ssml-builder');
const _ = require('lodash');

const {
    MelvinAttributes,
    MelvinIntentErrors,
    melvin_error
} = require('../common.js');

const { get_cnv_change_percent } = require('../http_clients/cnv_client.js');
const { add_cnv_plot } = require('../utils/response_builder_utils.js');

async function build_cnv_response(params) {
    const speech = new Speech();
    const image_list = [];

    try {
        const response = await get_cnv_change_percent(params);
        if (response['data']) {
            add_cnv_plot(image_list, params);
            if (params.cnv_change === 'alterations' && response['data']['amplifications'] &&
                response['data']['deletions']) {
                speech
                    .sayAs({ word: response['data']['amplifications'], interpret: 'digits' })
                    .say(`percentage of ${params[MelvinAttributes.STUDY_NAME]}`
                        + ` cancer patients have amplifications whereas`);
                speech.sayAs({ word: response['data']['deletions'], interpret: 'digits' })
                speech.say(`percentage have deletions at ${params[MelvinAttributes.GENE_NAME]}`);

            } else if (response['data'][params.cnv_change]) {
                speech
                    .sayAs({ word: response['data'][params.cnv_change], interpret: 'digits' })
                    .say(`percentage of ${params[MelvinAttributes.STUDY_NAME]} cancer patients have ` +
                        `${params.cnv_change} at ${params[MelvinAttributes.GENE_NAME]}`);
            } else {
                speech.say(`Sorry, I could not find the requested CNV change data.`);
            }

        } else if (response['error'] && response['error'] === MelvinExplorerErrors.UNIDENTIFIED_STUDY) {
            speech.say(`Sorry, I could not find a study called ${params[MelvinAttributes.STUDY_NAME]}`);

        } else if (response['error'] && response['error'] === MelvinExplorerErrors.UNIDENTIFIED_GENE) {
            speech.say(`Sorry, I could not find a gene called ${params[MelvinAttributes.GENE_NAME]}`);

        } else {
            speech.say(`There was a problem while looking for ${params.cnv_change} in ` +
                `${params[MelvinAttributes.GENE_NAME]} for ${params[MelvinAttributes.STUDY_NAME]}`
                + ` cancer patients. Please try again.`);
        }

    } catch (error) {
        speech.say(`Something went wrong. Please try again later.`);
        console.error(`build_cnv_response | message: ${error.message}`, error);
    }

    return {
        'speech_text': speech.ssml(),
        'image_list': image_list
    }
};


async function build_navigate_cnv_response(params) {
    const speech = new Speech();
    const image_list = [];
    console.info(`[build_mutations_response] params: ${JSON.stringify(params)}`);
    const response = await get_cnv_change_percent(params);

    if (_.isEmpty(params[MelvinAttributes.GENE_NAME]) && !_.isEmpty(params[MelvinAttributes.STUDY_NAME])) {
        const records_list = response['data']['records'];

        if (Array.isArray(records_list)) {
            add_cnv_plot(image_list, params);
            if (records_list.length > 2) {
                speech
                    .say(`${records_list[0]['gene']} and ${records_list[1]['gene']} have the greatest number of`
                        + ` copy number alterations in ${params[MelvinAttributes.STUDY_NAME]} at`
                        + ` ${records_list[0]['cna_percentage'].toFixed(1)} percent and`
                        + ` ${records_list[0]['cna_percentage'].toFixed(1)} percent respectively`);

            } else if (records_list.length > 1) {
                speech
                    .say(`${records_list[0]['gene']} has the greatest number of`
                        + ` copy number alterations in ${params[MelvinAttributes.STUDY_NAME]} at`
                        + ` ${records_list[0]['cna_percentage']} percent`);

            } else if (records_list.length == 1) {
                speech
                    .say(`${records_list[0]['gene']} is the only gene that contains`
                        + ` copy number alterations in ${params[MelvinAttributes.STUDY_NAME]} at`
                        + ` ${records_list[0]['cna_percentage']} percent`);

            } else {
                speech.say('There were no copy number alterations found.');
            }

        } else {
            throw melvin_error(
                `Invalid response from MELVIN_EXPLORER: ${JSON.stringify(response)}`,
                MelvinIntentErrors.INVALID_API_RESPOSE,
                `Sorry, I'm having trouble accessing copy number alteration records for `
                + params[MelvinAttributes.GENE_NAME]
            );
        }

    } else if (!_.isEmpty(params[MelvinAttributes.GENE_NAME]) && !_.isEmpty(params[MelvinAttributes.STUDY_NAME])) {
        add_cnv_plot(image_list, params);

        if (response['data']['amplifications_percentage'] && response['data']['deletions_percentage']) {
            const amplifications = response['data']['amplifications_percentage'].toFixed(1);
            const deletions = response['data']['deletions_percentage'].toFixed(1);

            speech
                .say(`${amplifications} percent of ${params[MelvinAttributes.STUDY_NAME]}`
                    + ` patients have amplifications at ${params[MelvinAttributes.GENE_NAME]} while`
                    + ` ${deletions} percent have deletions.`);

        } else if (response['data']['amplifications_percentage']) {
            const amplifications = response['data']['amplifications_percentage'].toFixed(1);
            speech
                .say(`${amplifications} percent of ${params[MelvinAttributes.STUDY_NAME]}`
                    + ` patients have amplifications at ${params[MelvinAttributes.GENE_NAME]}`);

        } else if (response['data']['deletions_percentage']) {
            const deletions = response['data']['deletions_percentage'].toFixed(1);
            speech
                .say(`${deletions} percent of ${params[MelvinAttributes.STUDY_NAME]}`
                    + ` patients have deletions at ${params[MelvinAttributes.GENE_NAME]}`);

        } else {
            speech.say(`Sorry, I could not find copy number alterations data for ${params[MelvinAttributes.STUDY_NAME]}`
                + ` in ${params[MelvinAttributes.GENE_NAME]}`);
        }

    } else {
        throw melvin_error(
            `[build_mutations_response] invalid state: ${JSON.stringify(params)}`,
            MelvinIntentErrors.INVALID_STATE,
            'Sorry, I got lost during the conversation. Please start over.'
        );
    }

    return {
        'speech_text': speech.ssml(),
        'image_list': image_list
    }
}


module.exports = {
    build_cnv_response,
    build_navigate_cnv_response
}