const _ = require('lodash');

const {
    MelvinAttributes,
    MelvinIntentErrors,
    DataSources,
    melvin_error,
    DEFAULT_INVALID_STATE_RESPONSE,
    MELVIN_EXPLORER_ENDPOINT
} = require('../common.js');

const {
    get_splitby_tcga_stats
} = require('../http_clients/splitby_tcga_client.js');

const { add_to_APL_image_pager } = require('../utils/APL_utils.js');
const { build_ssml_response_from_nunjucks } = require('../utils/response_builder_utils.js');

const add_splitby_tcga_stats_plot = function(image_list, melvin_state, splitby_state) {
    const splitby_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/splitby/tcga/plot`);
    splitby_url.searchParams.set('melvin_state', JSON.stringify(melvin_state));
    splitby_url.searchParams.set('splitby_state', JSON.stringify(splitby_state));
    image_list.push(splitby_url);
}

async function build_splitby_tcga_response(handlerInput, melvin_state, splitby_state) {
    const image_list = [];
    const response = await get_splitby_tcga_stats(melvin_state, splitby_state);

    const nunjucks_context = {
        MelvinAttributes,
        melvin_state: melvin_state,
        splitby_state: splitby_state,
        splitby_response: response
    };
    const speech_ssml = build_ssml_response_from_nunjucks('splitby/splitby_tcga.njk', nunjucks_context);

    add_splitby_tcga_stats_plot(image_list, melvin_state, splitby_state);
    add_to_APL_image_pager(handlerInput, image_list);    
    return {
        'speech_text': speech_ssml
    }
}

async function build_splitby_clinvar_response(handlerInput, melvin_state, splitby_state) {
    const nunjucks_context = {
        MelvinAttributes,
        melvin_state: melvin_state,
        splitby_state: splitby_state,
    };

    const speech_ssml = build_ssml_response_from_nunjucks('splitby/splitby_clinvar.njk', nunjucks_context);
    return {
        'speech_text': speech_ssml
    }
}

async function build_splitby_response(handlerInput, melvin_state, splitby_state) {
    console.info(`[build_splitby_response] melvin_state: ${JSON.stringify(melvin_state)}, ` + 
        `splitby_state: ${JSON.stringify(splitby_state)}`);
    let response = {};
    if (!_.isEmpty(melvin_state[MelvinAttributes.STUDY_ABBRV])) {
        splitby_state[MelvinAttributes.STUDY_ABBRV] = melvin_state[MelvinAttributes.STUDY_ABBRV];
    }
    
    if (melvin_state[MelvinAttributes.DSOURCE] === DataSources.TCGA) {
        response = await build_splitby_tcga_response(handlerInput, melvin_state, splitby_state);

    } else if (melvin_state[MelvinAttributes.DSOURCE] === DataSources.CLINVAR) {
        response = await build_splitby_clinvar_response(handlerInput, melvin_state, splitby_state);

    } else {
        throw melvin_error(
            `[build_splitby_response] invalid state: melvin_state: ${JSON.stringify(melvin_state)}, ` + 
                `splitby_state: ${JSON.stringify(splitby_state)}`,
            MelvinIntentErrors.INVALID_STATE,
            DEFAULT_INVALID_STATE_RESPONSE
        );
    }
    return response;
}

module.exports = {
    build_splitby_response
}