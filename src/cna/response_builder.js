const Speech = require('ssml-builder');
const _ = require('lodash');

const {
    MelvinAttributes,
    DataSources,
    MelvinIntentErrors,
    melvin_error,
    DEFAULT_INVALID_STATE_RESPONSE,
    DEFAULT_NOT_IMPLEMENTED_RESPONSE
} = require('../common.js');

const {
     build_cna_tcga_response,
     build_cna_compare_tcga_response
 } = require('../cna/tcga_response_builder.js');

async function build_navigate_cna_response(handlerInput, params) {
    console.info(`[build_navigate_cna_response] params: ${JSON.stringify(params)}`);
    let response = {};
    if (params[MelvinAttributes.DSOURCE] === DataSources.TCGA) {
        response = await build_cna_tcga_response(handlerInput, params);

    } else if (params[MelvinAttributes.DSOURCE] === DataSources.CLINVAR) {
        response = {
            'speech_text': DEFAULT_NOT_IMPLEMENTED_RESPONSE
        };

    } else {
        throw melvin_error(
            `[build_mutations_response] invalid state: ${JSON.stringify(params)}`,
            MelvinIntentErrors.INVALID_STATE,
            DEFAULT_INVALID_STATE_RESPONSE
        );
    }
    return response;
}

async function build_cna_compare_response(handlerInput, params, compare_params, sate_diff) {
    console.info(`[build_cna_compare_response] params: ${JSON.stringify(params)}`);
    let response = {};
    if (params[MelvinAttributes.DSOURCE] === DataSources.TCGA) {
        response = await build_cna_compare_tcga_response(handlerInput, params, compare_params, sate_diff);

    } else if (params[MelvinAttributes.DSOURCE] === DataSources.CLINVAR) {
        response = {
            'speech_text': "Copy number alterations compare analysis is not supported in clinvar."
        };

    } else {
        throw melvin_error(
            `[build_cna_compare_response] invalid state: ${JSON.stringify(params)}`,
            MelvinIntentErrors.INVALID_STATE,
            DEFAULT_INVALID_STATE_RESPONSE
        );
    }
    return response;
}


module.exports = {
    build_navigate_cna_response,
    build_cna_compare_response
}