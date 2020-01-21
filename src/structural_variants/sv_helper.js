const {
    MelvinAttributes,
    MelvinIntentErrors,
    DataSources,
    melvin_error,
    DEFAULT_MELVIN_ERROR_SPEECH_TEXT
} = require('../common.js');

const {
    build_sv_clinvar_response
} = require('../structural_variants/clinvar_response_builder.js');

async function build_sv_response(handlerInput, params) {
    console.info(`[build_sv_response] params: ${JSON.stringify(params)}`);
    let response = {};
    if (params[MelvinAttributes.DSOURCE] === DataSources.TCGA) {
        response = {
            'speech_text': "Structural variants analysis is not supported in TCGA."
        };

    } else if (params[MelvinAttributes.DSOURCE] === DataSources.CLINVAR) {
        response = await build_sv_clinvar_response(handlerInput, params);

    } else {
        throw melvin_error(
            `[build_sv_response] invalid state: ${JSON.stringify(params)}`,
            MelvinIntentErrors.INVALID_STATE,
            DEFAULT_MELVIN_ERROR_SPEECH_TEXT
        );
    }
    return response;
}

module.exports = {
    build_sv_response
}
