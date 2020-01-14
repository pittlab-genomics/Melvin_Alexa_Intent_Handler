const Speech = require('ssml-builder');
const _ = require('lodash');

const {
    MelvinAttributes,
    MelvinIntentErrors,
    melvin_error,
    DEFAULT_MELVIN_ERROR_SPEECH_TEXT,
    CNVTypes
} = require('../common.js');

const { get_cnv_change_percent } = require('../http_clients/cnv_client.js');
const { add_cnv_plot, round } = require('../utils/response_builder_utils.js');

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

function build_cnv_alterations_response(params, response, speech) {
    if (params.cnv_change == CNVTypes.ALTERATIONS
        && response['data']['amplifications_percentage']
        && response['data']['deletions_percentage']) {
        const amplifications = round(response['data']['amplifications_percentage'], 1);
        const deletions = round(response['data']['deletions_percentage'], 1);
        speech
            .say(`${params[MelvinAttributes.GENE_NAME]} is amplified in`
                + ` ${amplifications} percent of ${params[MelvinAttributes.STUDY_NAME]}`
                + ` patients while deleted in ${deletions} percent`);

    } else if ((params.cnv_change == CNVTypes.ALTERATIONS || params.cnv_change == CNVTypes.AMPLIFICATIONS)
        && response['data']['amplifications_percentage']) {
        build_cnv_amplifications_response(params, response, speech)

    } else if ((params.cnv_change == CNVTypes.ALTERATIONS || params.cnv_change == CNVTypes.DELETIONS)
        && response['data']['deletions_percentage']) {
        build_cnv_deletions_response(params, response, speech)

    } else {
        speech.say(`Sorry, I could not find copy number alterations data for`
            + ` ${params[MelvinAttributes.STUDY_NAME]} in ${params[MelvinAttributes.GENE_NAME]}`);
    }
}

function build_cnv_deletions_response(params, response, speech) {
    const deletions = round(response['data']['deletions_percentage'], 1);
    speech
        .say(`${params[MelvinAttributes.GENE_NAME]} is deleted in ${deletions} percent of`
            + ` ${params[MelvinAttributes.STUDY_NAME]} patients`);

}

function build_cnv_amplifications_response(params, response, speech) {
    const amplifications = round(response['data']['amplifications_percentage'], 1);
    speech
        .say(`${params[MelvinAttributes.GENE_NAME]} is amplified in ${amplifications} percent of`
            + ` ${params[MelvinAttributes.STUDY_NAME]} patients.`);
}

function build_cnv_by_study_response(params, response, speech) {
    const records_list = response['data']['records'];
    if (Array.isArray(records_list)) {
        if (records_list.length > 2) {
            speech
                .say(`${records_list[0]['gene']} and ${records_list[1]['gene']} have the greatest number of`
                    + ` copy number alterations in ${params[MelvinAttributes.STUDY_NAME]} at`
                    + ` ${round(records_list[0]['cna_percentage'], 1)} percent and`
                    + ` ${round(records_list[0]['cna_percentage'], 1)} percent respectively`);

        } else if (records_list.length > 1) {
            speech
                .say(`${records_list[0]['gene']} has the greatest number of`
                    + ` copy number alterations in ${params[MelvinAttributes.STUDY_NAME]} at`
                    + ` ${round(records_list[0]['cna_percentage'], 1)} percent`);

        } else if (records_list.length == 1) {
            speech
                .say(`${records_list[0]['gene']} is the only gene that contains`
                    + ` copy number alterations in ${params[MelvinAttributes.STUDY_NAME]} at`
                    + ` ${round(records_list[0]['cna_percentage'], 1)} percent`);

        } else {
            speech.say('There were no copy number alterations found.');
        }

    } else {
        throw melvin_error(
            `[build_cnv_by_study_response] Invalid response from MELVIN_EXPLORER: ${JSON.stringify(response)}`,
            MelvinIntentErrors.INVALID_API_RESPOSE,
            `Sorry, I'm having trouble accessing copy number alteration records for `
            + params[MelvinAttributes.GENE_NAME]
        );
    }
}

async function build_navigate_cnv_response(params) {
    const speech = new Speech();
    const image_list = [];
    console.info(`[build_mutations_response] params: ${JSON.stringify(params)}`);
    const response = await get_cnv_change_percent(params);

    if (_.isEmpty(params[MelvinAttributes.GENE_NAME]) && !_.isEmpty(params[MelvinAttributes.STUDY_NAME])) {
        add_cnv_plot(image_list, params);
        build_cnv_by_study_response(params, response, speech);

    } else if (!_.isEmpty(params[MelvinAttributes.GENE_NAME]) && !_.isEmpty(params[MelvinAttributes.STUDY_NAME])) {
        add_cnv_plot(image_list, params);
        build_cnv_alterations_response(params, response, speech);

    } else {
        throw melvin_error(
            `[build_navigate_cnv_response] invalid state: ${JSON.stringify(params)}`,
            MelvinIntentErrors.INVALID_STATE,
            DEFAULT_MELVIN_ERROR_SPEECH_TEXT
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