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
const { get_snv_ind_compare_tcga_stats } = require("../http_clients/melvin_explorer_client.js");


async function build_snv_ind_compare_tcga_response(handlerInput, melvin_state, compare_state, state_diff) {
    const image_list = [];
    const response = await get_snv_ind_compare_tcga_stats(handlerInput, melvin_state, compare_state);
    const nunjucks_context = {
        melvin_state: melvin_state,
        state_diff:   state_diff,
        response:     response
    };
    const speech_ssml = build_ssml_response_from_nunjucks("dtype_compare/snv_ind.njk", nunjucks_context);

    add_snv_ind_tcga_plot(image_list, melvin_state);
    add_to_APL_image_pager(handlerInput, image_list);
    return { "speech_text": speech_ssml };
}

async function build_snv_ind_compare_response(handlerInput, params, compare_state, state_diff) {
    console.info(`[build_snv_ind_compare_response] params: ${JSON.stringify(params)}`);
    let response = {};
    if (params[MelvinAttributes.DSOURCE] === DataSources.TCGA) {
        response = await build_snv_ind_compare_tcga_response(handlerInput, params, compare_state, state_diff);

    } else if (params[MelvinAttributes.DSOURCE] === DataSources.CLINVAR) {
        throw melvin_error(
            `[build_snv_ind_compare_response] not implemented: ${JSON.stringify(params)}`,
            MelvinIntentErrors.NOT_IMPLEMENTED,
            "SNVs and Indel comparison analysis is not supported in clinvar."
        );

    } else {
        throw melvin_error(
            `[build_snv_ind_compare_response] invalid state: ${JSON.stringify(params)}`,
            MelvinIntentErrors.INVALID_STATE,
            DEFAULT_INVALID_STATE_RESPONSE
        );
    }
    return response;
}

const add_snv_ind_tcga_plot = function (image_list, params) {
    const compare_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/comparison/tcga/SNVvIND_plot`);
    add_query_params(compare_url, params);
    image_list.push(compare_url);
};

module.exports = { build_snv_ind_compare_response };