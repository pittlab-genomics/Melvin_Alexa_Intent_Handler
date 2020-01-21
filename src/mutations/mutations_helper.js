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
    build_mutations_tcga_response,
    build_mutations_tcga_domain_response
} = require('../mutations/tcga_response_builder.js');

const {
    build_mutations_clinvar_response
} = require('../mutations/clinvar_response_builder.js');

async function build_mutations_response(handlerInput, params) {
    console.info(`[build_mutations_response] params: ${JSON.stringify(params)}`);
    let response = {};
    if (params[MelvinAttributes.DSOURCE] === DataSources.TCGA) {
        response = await build_mutations_tcga_response(handlerInput, params);

    } else if (params[MelvinAttributes.DSOURCE] === DataSources.CLINVAR) {
        response = await build_mutations_clinvar_response(handlerInput, params);

    } else {
        throw melvin_error(
            `[build_mutations_response] invalid state: ${JSON.stringify(params)}`,
            MelvinIntentErrors.INVALID_STATE,
            DEFAULT_MELVIN_ERROR_SPEECH_TEXT
        );
    }
    return response;
}

async function build_mutations_domain_response(handlerInput, params) {
    console.info(`[build_mutations_domain_response] params: ${JSON.stringify(params)}`);
    let response = {};
    if (params[MelvinAttributes.DSOURCE] === DataSources.TCGA) {
        response = await build_mutations_tcga_domain_response(handlerInput, params);

    } else if (params[MelvinAttributes.DSOURCE] === DataSources.CLINVAR) {
        response = {
            'speech_text': "Mutation domains analysis is not supported in clinvar."
        };

    } else {
        throw melvin_error(
            `[build_mutations_domain_response] invalid state: ${JSON.stringify(params)}`,
            MelvinIntentErrors.INVALID_STATE,
            DEFAULT_MELVIN_ERROR_SPEECH_TEXT
        );
    }
    return response;
}

module.exports = {
    build_mutations_response,
    build_mutations_domain_response
}
