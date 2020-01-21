const {
    MelvinAttributes,
    MelvinIntentErrors,
    DataSources,
    melvin_error,
    DEFAULT_MELVIN_ERROR_SPEECH_TEXT,
    DEFAULT_MELVIN_NOT_IMPLEMENTED_RESPONSE
} = require('../common.js');

const {
    build_overview_clinvar_response
} = require('../overview/clinvar_response_builder.js');

async function build_overview_response(handlerInput, params) {
    console.info(`[build_overview_response] params: ${JSON.stringify(params)}`);
    let response = {};
    if (params[MelvinAttributes.DSOURCE] === DataSources.TCGA) {
        response = {
            'speech_text': DEFAULT_MELVIN_NOT_IMPLEMENTED_RESPONSE
        };

    } else if (params[MelvinAttributes.DSOURCE] === DataSources.CLINVAR) {
        response = await build_overview_clinvar_response(handlerInput, params);

    } else {
        throw melvin_error(
            `[build_overview_response] invalid state: ${JSON.stringify(handlerInput, params)}`,
            MelvinIntentErrors.INVALID_STATE,
            DEFAULT_MELVIN_ERROR_SPEECH_TEXT
        );
    }
    return response;
}

module.exports = {
    build_overview_response
}
