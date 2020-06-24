const Speech = require('ssml-builder');
const _ = require('lodash');

const {
    MelvinAttributes,
    MelvinIntentErrors,
    DataSources,
    melvin_error,
    DEFAULT_MELVIN_ERROR_SPEECH_TEXT
} = require('../common.js');

const {
    build_mut_cnv_compare_tcga_response
} = require('../comparison/tcga_mut_cnv_response_builder.js');

async function build_mut_cnv_splitby_response(handlerInput, params, sate_diff) {
    console.info(`[build_mut_cnv_splitby_response] params: ${JSON.stringify(params)}`);
    let response = {};
    if (params[MelvinAttributes.DSOURCE] === DataSources.TCGA) {
        response = await build_mut_cnv_compare_tcga_response(handlerInput, params, sate_diff);

    } else if (params[MelvinAttributes.DSOURCE] === DataSources.CLINVAR) {
        response = {
            'speech_text': "Mutations and copy number alterations comparison analysis is not supported in clinvar."
        };

    } else {
        throw melvin_error(
            `[build_mut_cnv_splitby_response] invalid state: ${JSON.stringify(params)}`,
            MelvinIntentErrors.INVALID_STATE,
            DEFAULT_MELVIN_ERROR_SPEECH_TEXT
        );
    }
    return response;
}

module.exports = {
    build_mut_cnv_splitby_response
}