const Speech = require('ssml-builder');
const _ = require('lodash');

const {
    MelvinAttributes,
    MelvinIntentErrors,
    DataSources,
    melvin_error,
    nunjucks_env,
    DEFAULT_INVALID_STATE_RESPONSE,
    MELVIN_EXPLORER_ENDPOINT
} = require('../common.js');

const {
    get_gene_expression_tcga_stats
} = require('../http_clients/gene_expression_tcga_client.js');

const { add_to_APL_image_pager } = require('../utils/APL_utils.js');
const { add_query_params } = require('../utils/response_builder_utils.js');

const add_gene_expression_tcga_stats_plot = function(image_list, params) {
    const count_plot_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/gene_expression/tcga/plot`);
    add_query_params(count_plot_url, params);
    image_list.push(count_plot_url);
}

async function build_gene_expression_tcga_response(handlerInput, params) {
    const speech = new Speech();
    const image_list = [];
    const response = await get_gene_expression_tcga_stats(params);

    const nunjucks_context = {
        MelvinAttributes,
        melvin_state: params,
        exp_response: response
    };

    const nunjucks_res = nunjucks_env
        .render('gene_expression/gene_expression_tcga.njk', nunjucks_context)
        .replace(/\r?\n|\r/g, ' ')
        .replace(/\s+/g,' ');

    if (nunjucks_res == MelvinIntentErrors.INVALID_STATE) {
        throw melvin_error(
            `[build_gene_expression_tcga_response] invalid state: ${JSON.stringify(params)}`,
            MelvinIntentErrors.INVALID_STATE,
            'Sorry, I need a gene name to make a comparison.'
        );    
    }
    
    speech.sayWithSSML(nunjucks_res);
    add_gene_expression_tcga_stats_plot(image_list, params);
    add_to_APL_image_pager(handlerInput, image_list);    
    return {
        'speech_text': speech.ssml()
    }
}

async function build_gene_expression_clinvar_response(handlerInput, params) {
    const speech = new Speech();
    const nunjucks_context = {
        MelvinAttributes,
        melvin_state: params
    };

    const nunjucks_res = nunjucks_env
        .render('gene_expression/gene_expression_clinvar.njk', nunjucks_context)
        .replace(/\r?\n|\r/g, ' ')
        .replace(/\s+/g,' ');

    if (nunjucks_res == MelvinIntentErrors.INVALID_STATE) {
        throw melvin_error(
            `[build_gene_expression_tcga_response] invalid state: ${JSON.stringify(params)}`,
            MelvinIntentErrors.INVALID_STATE,
            'Sorry, I need a gene name to make a comparison.'
        );    
    }
    
    speech.sayWithSSML(nunjucks_res);
    return {
        'speech_text': speech.ssml()
    }
}

async function build_gene_expression_response(handlerInput, params) {
    console.info(`[build_gene_expression_response] params: ${JSON.stringify(params)}`);
    let response = {};
    if (params[MelvinAttributes.DSOURCE] === DataSources.TCGA) {
        response = await build_gene_expression_tcga_response(handlerInput, params);

    } else if (params[MelvinAttributes.DSOURCE] === DataSources.CLINVAR) {
        response = await build_gene_expression_clinvar_response(handlerInput, params);

    } else {
        throw melvin_error(
            `[build_gene_expression_response] invalid state: ${JSON.stringify(params)}`,
            MelvinIntentErrors.INVALID_STATE,
            DEFAULT_INVALID_STATE_RESPONSE
        );
    }
    return response;
}

module.exports = {
    build_gene_expression_response
}