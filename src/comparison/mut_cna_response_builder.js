const _ = require("lodash");

const {
    MelvinAttributes,
    MelvinIntentErrors,
    DataSources,
    melvin_error,
    MELVIN_EXPLORER_ENDPOINT,
    DEFAULT_INVALID_STATE_RESPONSE
} = require("../common.js");

const { add_to_APL_image_pager } = require("../utils/APL_utils.js");
const {
    add_query_params, build_ssml_response_from_nunjucks 
} = require("../utils/response_builder_utils.js");
const { get_mutations_tcga_stats } = require("../http_clients/mutations_tcga_client.js");
const { get_cna_tcga_stats } = require("../http_clients/cna_tcga_client.js");

async function build_mut_cna_compare_tcga_response(handlerInput, melvin_state, sate_diff) {
    const image_list = [];
    const results = await Promise.all([
        get_mutations_tcga_stats(melvin_state),
        get_cna_tcga_stats(melvin_state)
    ]);
    const nunjucks_context = {
        melvin_state: melvin_state,
        sate_diff:    sate_diff,
        mut_response: results[0],
        cna_response: results[1],
    };
    const speech_ssml = build_ssml_response_from_nunjucks("dtype_compare/mut_cna.njk", nunjucks_context);
    add_mut_cna_tcga_plot(image_list, melvin_state);
    add_to_APL_image_pager(handlerInput, image_list);
    return { "speech_text": speech_ssml };
}

async function build_mut_cna_compare_response(handlerInput, params, sate_diff) {
    console.info(`[build_mut_cna_compare_response] params: ${JSON.stringify(params)}`);
    let response = {};
    if (params[MelvinAttributes.DSOURCE] === DataSources.TCGA) {
        response = await build_mut_cna_compare_tcga_response(handlerInput, params, sate_diff);

    } else if (params[MelvinAttributes.DSOURCE] === DataSources.CLINVAR) {
        throw melvin_error(
            `[build_mut_cna_compare_response] not implemented: ${JSON.stringify(params)}`,
            MelvinIntentErrors.NOT_IMPLEMENTED,
            "Mutations and copy number alterations comparison analysis is not supported in clinvar."
        );

    } else {
        throw melvin_error(
            `[build_mut_cna_compare_response] invalid state: ${JSON.stringify(params)}`,
            MelvinIntentErrors.INVALID_STATE,
            DEFAULT_INVALID_STATE_RESPONSE
        );
    }
    return response;
}

const add_mut_cna_tcga_plot = function (image_list, params) {
    const compare_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/comparison/tcga/mutations_cna_plot`);
    add_query_params(compare_url, params);
    image_list.push(compare_url);
};

module.exports = { build_mut_cna_compare_response };