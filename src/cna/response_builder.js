const _ = require("lodash");

const {
    MelvinAttributes,
    DataSources,
    MelvinIntentErrors,
    melvin_error,
    MELVIN_EXPLORER_ENDPOINT,
    DEFAULT_INVALID_STATE_RESPONSE,
    DEFAULT_NOT_IMPLEMENTED_RESPONSE
} = require("../common.js");

const { add_to_APL_image_pager } = require("../utils/APL_utils.js");
const {
    add_query_params, build_ssml_response_from_nunjucks 
} = require("../utils/response_builder_utils.js");
const { get_cna_tcga_stats } = require("../http_clients/melvin_explorer_client.js");


async function build_cna_tcga_response(handlerInput, melvin_state) {
    const image_list = [];
    const response = await get_cna_tcga_stats(handlerInput, melvin_state);
    const nunjucks_context = {
        melvin_state: melvin_state,
        response:     response
    };
    const speech_ssml = build_ssml_response_from_nunjucks("cna/cna_tcga.njk", nunjucks_context);
    add_cna_tcga_plot(image_list, melvin_state);
    add_to_APL_image_pager(handlerInput, image_list);

    return { "speech_text": speech_ssml };
}

async function build_cna_compare_tcga_response(handlerInput, melvin_state, compare_params, sate_diff) {
    const image_list = [];
    const results = await Promise.all([
        get_cna_tcga_stats(handlerInput, melvin_state),
        get_cna_tcga_stats(handlerInput, compare_params)
    ]);
    const nunjucks_context = {
        melvin_state:     melvin_state,
        compare_params:   compare_params,
        sate_diff:        sate_diff,
        response:         results[0],
        compare_response: results[1]
    };
    const speech_ssml = build_ssml_response_from_nunjucks("cna/cna_compare_tcga.njk", nunjucks_context);
    add_cna_tcga_plot(image_list, melvin_state);
    add_cna_tcga_plot(image_list, compare_params);
    add_to_APL_image_pager(handlerInput, image_list);

    return { "speech_text": speech_ssml };
}


async function build_navigate_cna_response(handlerInput, params) {
    console.info(`[build_navigate_cna_response] params: ${JSON.stringify(params)}`);
    let response = {};
    if (params[MelvinAttributes.DSOURCE] === DataSources.TCGA) {
        response = await build_cna_tcga_response(handlerInput, params);

    } else if (params[MelvinAttributes.DSOURCE] === DataSources.CLINVAR) {
        throw melvin_error(
            `[build_navigate_cna_response] not implemented: ${JSON.stringify(params)}`,
            MelvinIntentErrors.NOT_IMPLEMENTED,
            DEFAULT_NOT_IMPLEMENTED_RESPONSE
        );
    } else {
        throw melvin_error(
            `[build_navigate_cna_response] invalid state: ${JSON.stringify(params)}`,
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
        throw melvin_error(
            `[build_cna_compare_response] not implemented: ${JSON.stringify(params)}`,
            MelvinIntentErrors.NOT_IMPLEMENTED,
            DEFAULT_NOT_IMPLEMENTED_RESPONSE
        );

    } else {
        throw melvin_error(
            `[build_cna_compare_response] invalid state: ${JSON.stringify(params)}`,
            MelvinIntentErrors.INVALID_STATE,
            DEFAULT_INVALID_STATE_RESPONSE
        );
    }
    return response;
}

const add_cna_tcga_plot = function (image_list, params) {
    const cna_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/cna/tcga/plot`);
    add_query_params(cna_url, params);
    image_list.push(cna_url);
};


module.exports = {
    build_navigate_cna_response,
    build_cna_compare_response
};