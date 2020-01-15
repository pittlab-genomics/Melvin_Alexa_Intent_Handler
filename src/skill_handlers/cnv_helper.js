const Speech = require('ssml-builder');
const _ = require('lodash');

const {
    MelvinAttributes,
    MelvinIntentErrors,
    melvin_error,
    DEFAULT_MELVIN_ERROR_SPEECH_TEXT,
    CNVTypes,
    get_gene_speech_text
} = require('../common.js');

const { get_cnvs_tcga_stats } = require('../http_clients/cnv_client.js');
const { add_cnvs_tcga_plot, round } = require('../utils/response_builder_utils.js');

async function build_cnv_response(params) {
    const speech = new Speech();
    const image_list = [];

    try {
        const response = await get_cnvs_tcga_stats(params);
        const gene_speech_text = get_gene_speech_text(params[MelvinAttributes.GENE_NAME]);

        if (response['data']) {
            add_cnvs_tcga_plot(image_list, params);
            if (params.cnv_change === 'alterations' && response['data']['amplifications'] &&
                response['data']['deletions']) {
                speech
                    .sayAs({ word: response['data']['amplifications'], interpret: 'digits' })
                    .say(`percentage of ${params[MelvinAttributes.STUDY_NAME]}`
                        + ` cancer patients have amplifications whereas`)
                    .sayAs({ word: response['data']['deletions'], interpret: 'digits' })
                    .say(`percentage have deletions at`)
                    .sayWithSSML(gene_speech_text);


            } else if (response['data'][params.cnv_change]) {
                speech
                    .sayAs({ word: response['data'][params.cnv_change], interpret: 'digits' })
                    .say(`percentage of ${params[MelvinAttributes.STUDY_NAME]} cancer patients have ` +
                        `${params.cnv_change} at`)
                    .sayWithSSML(gene_speech_text);
            } else {
                speech.say(`Sorry, I could not find the requested CNV change data.`);
            }

        } else if (response['error'] && response['error'] === MelvinExplorerErrors.UNIDENTIFIED_STUDY) {
            speech.say(`Sorry, I could not find a study called ${params[MelvinAttributes.STUDY_NAME]}`);

        } else if (response['error'] && response['error'] === MelvinExplorerErrors.UNIDENTIFIED_GENE) {
            speech
                .say(`Sorry, I could not find a gene called`)
                .sayWithSSML(gene_speech_text);

        } else {
            speech
                .say(`There was a problem while looking for ${params.cnv_change} in`)
                .sayWithSSML(gene_speech_text)
                .say(`for ${params[MelvinAttributes.STUDY_NAME]} cancer patients. Please try again.`);
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
    const gene_speech_text = get_gene_speech_text(params[MelvinAttributes.GENE_NAME]);
    const gene_0_speech_text = get_gene_speech_text(records_list[0]['gene']);
    const gene_1_speech_text = get_gene_speech_text(records_list[1]['gene']);
    const study = params[MelvinAttributes.STUDY_NAME];

    if (Array.isArray(records_list)) {
        if (records_list.length > 2) {
            speech
                .sayWithSSML(`${gene_0_speech_text} and ${gene_1_speech_text}`)
                .say(`have the greatest number of copy number alterations in ${study} at`)
                .say(`${round(records_list[0]['cna_percentage'], 1)} percent and`)
                .say(`${round(records_list[0]['cna_percentage'], 1)} percent respectively`);

        } else if (records_list.length > 1) {
            speech
                .sayWithSSML(gene_0_speech_text)
                .say(`has the greatest number of copy number alterations in ${study} at`)
                .say(`${round(records_list[0]['cna_percentage'], 1)} percent`);

        } else if (records_list.length == 1) {
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
            `Sorry, I'm having trouble accessing copy number alteration records for ${gene_speech_text}`
        );
    }
}

async function build_navigate_cnv_response(params) {
    const speech = new Speech();
    const image_list = [];
    console.info(`[build_mutations_response] params: ${JSON.stringify(params)}`);
    const response = await get_cnvs_tcga_stats(params);

    if (_.isEmpty(params[MelvinAttributes.GENE_NAME]) && !_.isEmpty(params[MelvinAttributes.STUDY_NAME])) {
        add_cnvs_tcga_plot(image_list, params);
        build_cnv_by_study_response(params, response, speech);

    } else if (!_.isEmpty(params[MelvinAttributes.GENE_NAME]) && !_.isEmpty(params[MelvinAttributes.STUDY_NAME])) {
        add_cnvs_tcga_plot(image_list, params);
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