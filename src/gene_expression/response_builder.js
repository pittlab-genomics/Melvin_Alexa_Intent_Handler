const {
    MelvinAttributes,
    MelvinIntentErrors,
    DataSources,
    melvin_error,
    DEFAULT_INVALID_STATE_RESPONSE,
    DEFAULT_NOT_IMPLEMENTED_RESPONSE,
    MELVIN_EXPLORER_ENDPOINT
} = require("../common.js");

const { get_gene_expression_tcga_stats } = require("../http_clients/melvin_explorer_client.js");

const { add_to_APL_image_pager } = require("../utils/APL_utils.js");
const {
    add_query_params, build_ssml_response_from_nunjucks 
} = require("../utils/response_builder_utils.js");

const add_gene_expression_tcga_plot = function(image_list, params) {
    const count_plot_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/gene_expression/tcga/plot`);
    add_query_params(count_plot_url, params);
    image_list.push(count_plot_url);
};

async function build_gene_expression_tcga_response(handlerInput, params) {
    const image_list = [];
    const response = await get_gene_expression_tcga_stats(handlerInput, params);

    const nunjucks_context = {
        MelvinAttributes,
        melvin_state: params,
        exp_response: response
    };
    add_gene_expression_tcga_plot(image_list, params);
    await add_to_APL_image_pager(handlerInput, image_list);
    return build_ssml_response_from_nunjucks("gene_expression/gene_expression_tcga.njk", nunjucks_context);
}

async function build_gene_expression_response(handlerInput, params) {
    console.info(`[build_gene_expression_response] params: ${JSON.stringify(params)}`);
    let response = {};
    if (params[MelvinAttributes.DSOURCE] === DataSources.TCGA) {
        response = await build_gene_expression_tcga_response(handlerInput, params);

    } else if (params[MelvinAttributes.DSOURCE] === DataSources.CLINVAR) {
        //response = await build_gene_expression_clinvar_response(handlerInput, params);
        throw melvin_error(
            `[build_gene_expression_response] not implemented: ${JSON.stringify(params)}`,
            MelvinIntentErrors.NOT_IMPLEMENTED,
            DEFAULT_NOT_IMPLEMENTED_RESPONSE
        );

    } else {
        throw melvin_error(
            `[build_gene_expression_response] invalid state: ${JSON.stringify(params)}`,
            MelvinIntentErrors.INVALID_STATE,
            DEFAULT_INVALID_STATE_RESPONSE
        );
    }
    return response;
}

async function build_gene_expression_compare_tcga_response(handlerInput, melvin_state, compare_params, state_diff) {
    const image_list = [];
    const results = await Promise.all([
        get_gene_expression_tcga_stats(handlerInput, melvin_state),
        get_gene_expression_tcga_stats(handlerInput, compare_params)
    ]);
    const nunjucks_context = {
        melvin_state:     melvin_state,
        compare_params:   compare_params,
        state_diff:       state_diff,
        response:         results[0],
        compare_response: results[1]
    };
    add_gene_expression_tcga_plot(image_list, melvin_state);
    add_gene_expression_tcga_plot(image_list, compare_params);
    await add_to_APL_image_pager(handlerInput, image_list);
    return build_ssml_response_from_nunjucks("gene_expression/gene_expression_compare_tcga.njk", nunjucks_context);
}

async function build_gene_expression_compare_response(handlerInput, params, compare_params, state_diff) {
    console.info(`[build_gene_expression_compare_response] params: ${JSON.stringify(params)}`);
    let response = {};
    if (params[MelvinAttributes.DSOURCE] === DataSources.TCGA) {
        response = await build_gene_expression_compare_tcga_response(handlerInput, params, compare_params, state_diff);

    } else if (params[MelvinAttributes.DSOURCE] === DataSources.CLINVAR) {
        throw melvin_error(
            `[build_gene_expression_compare_response] not implemented: ${JSON.stringify(params)}`,
            MelvinIntentErrors.NOT_IMPLEMENTED,
            DEFAULT_NOT_IMPLEMENTED_RESPONSE
        );

    } else {
        throw melvin_error(
            `[build_gene_expression_compare_response] invalid state: ${JSON.stringify(params)}`,
            MelvinIntentErrors.INVALID_STATE,
            DEFAULT_INVALID_STATE_RESPONSE
        );
    }
    return response;
}

module.exports = {
    build_gene_expression_response, build_gene_expression_compare_response 
};