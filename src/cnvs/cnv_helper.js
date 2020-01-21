const Speech = require('ssml-builder');
const _ = require('lodash');

const {
    MelvinAttributes,
    DataSources,
    MelvinIntentErrors,
    melvin_error,
    DEFAULT_MELVIN_ERROR_SPEECH_TEXT,
    DEFAULT_MELVIN_NOT_IMPLEMENTED_RESPONSE
} = require('../common.js');

const { build_cnvs_tcga_response } = require('../cnvs/tcga_response_builder.js');

async function build_navigate_cnv_response(handlerInput, params) {
    console.info(`[build_navigate_cnv_response] params: ${JSON.stringify(params)}`);
    let response = {};
    if (params[MelvinAttributes.DSOURCE] === DataSources.TCGA) {
        response = await build_cnvs_tcga_response(handlerInput, params);

    } else if (params[MelvinAttributes.DSOURCE] === DataSources.CLINVAR) {
        response = {
            'speech_text': DEFAULT_MELVIN_NOT_IMPLEMENTED_RESPONSE
        };

    } else {
        throw melvin_error(
            `[build_mutations_response] invalid state: ${JSON.stringify(params)}`,
            MelvinIntentErrors.INVALID_STATE,
            DEFAULT_MELVIN_ERROR_SPEECH_TEXT
        );
    }
    return response;
}


module.exports = {
    build_navigate_cnv_response
}