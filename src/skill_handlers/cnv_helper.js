const Speech = require('ssml-builder');
const _ = require('lodash');

const {
    MelvinAttributes,
    DataSources,
    MelvinIntentErrors,
    melvin_error,
    DEFAULT_MELVIN_ERROR_SPEECH_TEXT
} = require('../common.js');

const { build_cnvs_tcga_response } = require('../cnvs/tcga_response_builder.js');

async function build_navigate_cnv_response(params) {
    console.info(`[build_navigate_cnv_response] params: ${JSON.stringify(params)}`);
    let response = {};
    if (params[MelvinAttributes.DSOURCE] === DataSources.TCGA) {
        response = await build_cnvs_tcga_response(params);

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


module.exports = {
    build_navigate_cnv_response
}