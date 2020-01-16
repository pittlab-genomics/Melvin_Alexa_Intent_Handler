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

async function build_mutations_response(params) {
    console.info(`[build_mutations_response] params: ${JSON.stringify(params)}`);
    let response = {};
    if (params[MelvinAttributes.DSOURCE] === DataSources.TCGA) {
        response = await build_mutations_tcga_response(params);

    } else if (params[MelvinAttributes.DSOURCE] === DataSources.CLINVAR) {

    } else {
        throw melvin_error(
            `[build_mutations_response] invalid state: ${JSON.stringify(params)}`,
            MelvinIntentErrors.INVALID_STATE,
            DEFAULT_MELVIN_ERROR_SPEECH_TEXT
        );
    }
    return response;
}

async function build_mutations_domain_response(params) {
    console.info(`[build_mutations_domain_response] params: ${JSON.stringify(params)}`);
    let response = {};
    if (params[MelvinAttributes.DSOURCE] === DataSources.TCGA) {
        response = await build_mutations_tcga_domain_response(params);

    } else if (params[MelvinAttributes.DSOURCE] === DataSources.TCGA) {

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
