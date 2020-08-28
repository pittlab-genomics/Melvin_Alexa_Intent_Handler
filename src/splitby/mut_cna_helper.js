const Speech = require('ssml-builder');
const _ = require('lodash');

const {
    MelvinAttributes,
    MelvinIntentErrors,
    DataSources,
    melvin_error,
    DEFAULT_INVALID_STATE_RESPONSE
} = require('../common.js');

const {
    build_mut_cna_splitby_tcga_response
} = require('../splitby/tcga_mut_cna_response_builder.js');

async function build_mut_cna_splitby_response(handlerInput, melvin_state, splitby_state, sate_diff) {
    console.info(`[build_mut_cna_splitby_response] melvin_state: ${JSON.stringify(melvin_state)}`);
    let response = {};
    if (melvin_state[MelvinAttributes.DSOURCE] === DataSources.TCGA) {
        response = await build_mut_cna_splitby_tcga_response(handlerInput, melvin_state, splitby_state, sate_diff);

    } else if (melvin_state[MelvinAttributes.DSOURCE] === DataSources.CLINVAR) {
        response = {
            'speech_text': "Mutations and copy number alterations comparison analysis is not supported in clinvar."
        };

    } else {
        throw melvin_error(
            `[build_mut_cna_splitby_response] invalid state | melvin_state: ${JSON.stringify(melvin_state)},` +
            `splitby_state: ${JSON.stringify(splitby_state)}`,
            MelvinIntentErrors.INVALID_STATE,
            DEFAULT_INVALID_STATE_RESPONSE
        );
    }
    return response;
}

module.exports = {
    build_mut_cna_splitby_response
}