const _ = require("lodash");

const {
    MelvinAttributes,
    MelvinIntentErrors,
    DataSources,
    melvin_error,
    MELVIN_EXPLORER_ENDPOINT,
    DEFAULT_INVALID_STATE_RESPONSE,
    DEFAULT_NOT_IMPLEMENTED_RESPONSE
} = require("../common.js");
const { add_to_APL_image_pager } = require("../utils/APL_utils.js");
const {
    add_query_params,
    build_ssml_response_from_nunjucks 
} = require("../utils/response_builder_utils.js");
const {
    get_snvs_tcga_stats,
    get_snvs_tcga_domain_stats
} = require("../http_clients/melvin_explorer_client.js");

async function build_snvs_tcga_response(handlerInput, melvin_state) {
    const image_list = [];
    const response = await get_snvs_tcga_stats(handlerInput, melvin_state);
    const nunjucks_context = {
        melvin_state: melvin_state,
        response:     response
    };
    const speech_ssml = build_ssml_response_from_nunjucks("mutations/snvs_tcga.njk", nunjucks_context);

    if (!_.isEmpty(melvin_state[MelvinAttributes.GENE_NAME])
        && _.isEmpty(melvin_state[MelvinAttributes.STUDY_ABBRV])) {
        add_snv_tcga_plot(image_list, melvin_state, "bar");
        add_snv_tcga_plot(image_list, melvin_state, "treemap");
    } else if (_.isEmpty(melvin_state[MelvinAttributes.GENE_NAME])
        && !_.isEmpty(melvin_state[MelvinAttributes.STUDY_ABBRV])) {
        add_snv_tcga_plot(image_list, melvin_state, "bar");
    } else if (!_.isEmpty(melvin_state[MelvinAttributes.GENE_NAME])
        && !_.isEmpty(melvin_state[MelvinAttributes.STUDY_ABBRV])) {
        add_snv_tcga_plot(image_list, melvin_state, "profile");
    }
    
    add_to_APL_image_pager(handlerInput, image_list);

    return { "speech_text": speech_ssml };
}

async function build_snvs_tcga_domain_response(handlerInput, melvin_state) {
    const image_list = [];
    const response = await get_snvs_tcga_domain_stats(handlerInput, melvin_state);
    const records_list = response["data"]["records"].filter(item => item["domain"] !== "none");
    const nunjucks_context = {
        melvin_state: melvin_state,
        subtype:      "domain",
        response:     response,
        records_list: records_list
    };
    const speech_ssml = build_ssml_response_from_nunjucks("mutations/snvs_tcga.njk", nunjucks_context);

    if (!_.isEmpty(melvin_state[MelvinAttributes.GENE_NAME])
        && !_.isEmpty(melvin_state[MelvinAttributes.STUDY_ABBRV])) {
        add_snv_tcga_plot(image_list, melvin_state, "dompie");
        add_snv_tcga_plot(image_list, melvin_state, "domstack");
    }
    add_to_APL_image_pager(handlerInput, image_list);

    return { "speech_text": speech_ssml };
}

const add_snv_tcga_plot = function (image_list, params, style) {
    const count_plot_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/tcga/snv_plot`);
    add_query_params(count_plot_url, params);
    if(style) {
        count_plot_url.searchParams.set("style", style);
    }
    image_list.push(count_plot_url);
};

async function build_snvs_response(handlerInput, params) {
    console.info(`[build_snvs_response] params: ${JSON.stringify(params)}`);
    let response = {};
    if (params[MelvinAttributes.DSOURCE] === DataSources.TCGA) {
        response = await build_snvs_tcga_response(handlerInput, params);

    } else if (params[MelvinAttributes.DSOURCE] === DataSources.CLINVAR) {
        throw melvin_error(
            `[build_snvs_response] not implemented: ${JSON.stringify(params)}`,
            MelvinIntentErrors.NOT_IMPLEMENTED,
            DEFAULT_NOT_IMPLEMENTED_RESPONSE
        );
    } else {
        throw melvin_error(
            `[build_snvs_response] invalid state: ${JSON.stringify(params)}`,
            MelvinIntentErrors.INVALID_STATE,
            DEFAULT_INVALID_STATE_RESPONSE
        );
    }
    return response;
}

async function build_snv_domains_response(handlerInput, params) {
    console.info(`[build_snv_domains_response] params: ${JSON.stringify(params)}`);
    let response = {};
    if (params[MelvinAttributes.DSOURCE] === DataSources.TCGA) {
        response = await build_snvs_tcga_domain_response(handlerInput, params);

    } else if (params[MelvinAttributes.DSOURCE] === DataSources.CLINVAR) {
        throw melvin_error(
            `[build_snv_domains_response] not implemented: ${JSON.stringify(params)}`,
            MelvinIntentErrors.NOT_IMPLEMENTED,
            DEFAULT_NOT_IMPLEMENTED_RESPONSE
        );

    } else {
        throw melvin_error(
            `[build_snv_domains_response] invalid state: ${JSON.stringify(params)}`,
            MelvinIntentErrors.INVALID_STATE,
            DEFAULT_INVALID_STATE_RESPONSE
        );
    }
    return response;
}

module.exports = {
    build_snvs_response,
    build_snv_domains_response
};