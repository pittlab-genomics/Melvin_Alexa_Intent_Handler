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
    add_query_params, build_ssml_response_from_nunjucks
} = require("../utils/response_builder_utils.js");
const {
    get_mutations_tcga_stats,
    get_mutations_tcga_domain_stats
} = require("../http_clients/melvin_explorer_client.js");


async function build_mutations_tcga_response(handlerInput, melvin_state, opts={}) {
    const image_list = [];
    const response = await get_mutations_tcga_stats(handlerInput, melvin_state);
    const nunjucks_context = {
        melvin_state: melvin_state,
        response:     response
    };

    if (!_.isEmpty(melvin_state[MelvinAttributes.GENE_NAME])
        && _.isEmpty(melvin_state[MelvinAttributes.STUDY_ABBRV])) {

        add_mutations_tcga_plot(image_list, melvin_state, "bar");
        add_mutations_tcga_plot(image_list, melvin_state, "treemap");

    } else if (_.isEmpty(melvin_state[MelvinAttributes.GENE_NAME])
        && !_.isEmpty(melvin_state[MelvinAttributes.STUDY_ABBRV])) {

        add_mutations_tcga_plot(image_list, melvin_state, "bar");

    } else if (!_.isEmpty(melvin_state[MelvinAttributes.GENE_NAME])
        && !_.isEmpty(melvin_state[MelvinAttributes.STUDY_ABBRV])) {

        add_mutations_tcga_plot(image_list, melvin_state, "profile");
    }

    await add_to_APL_image_pager(handlerInput, image_list);
    return build_ssml_response_from_nunjucks("mutations/mutations_tcga.njk", nunjucks_context, opts);
}

async function build_mutations_tcga_domain_response(handlerInput, melvin_state, opts={}) {
    const image_list = [];
    const response = await get_mutations_tcga_domain_stats(handlerInput, melvin_state);
    const records_list = response["data"]["records"].filter(item => item["domain"] !== "none");
    const nunjucks_context = {
        melvin_state: melvin_state,
        subtype:      "domain",
        response:     response,
        records_list: records_list
    };

    if (!_.isEmpty(melvin_state[MelvinAttributes.GENE_NAME])
        && !_.isEmpty(melvin_state[MelvinAttributes.STUDY_ABBRV])) {

        add_mutations_tcga_plot(image_list, melvin_state, "dompie");
        add_mutations_tcga_plot(image_list, melvin_state, "domstack");
    }
    await add_to_APL_image_pager(handlerInput, image_list);
    return build_ssml_response_from_nunjucks("mutations/mutations_tcga.njk", nunjucks_context, opts);
}

async function build_mutations_compare_tcga_response(handlerInput, melvin_state, compare_params, state_diff, opts={}) {
    const image_list = [];
    const results = await Promise.all([
        get_mutations_tcga_stats(handlerInput, melvin_state),
        get_mutations_tcga_stats(handlerInput, compare_params)
    ]);
    const nunjucks_context = {
        melvin_state:     melvin_state,
        compare_params:   compare_params,
        state_diff:       state_diff,
        response:         results[0],
        compare_response: results[1]
    };
    if (!_.isEmpty(melvin_state[MelvinAttributes.GENE_NAME])
        && _.isEmpty(melvin_state[MelvinAttributes.STUDY_ABBRV])) {

        add_mutations_tcga_plot(image_list, melvin_state, "bar");
        add_mutations_tcga_plot(image_list, melvin_state, "treemap");

        add_mutations_tcga_plot(image_list, compare_params, "bar");
        add_mutations_tcga_plot(image_list, compare_params, "treemap");

    } else if (_.isEmpty(melvin_state[MelvinAttributes.GENE_NAME])
        && !_.isEmpty(melvin_state[MelvinAttributes.STUDY_ABBRV])) {

        add_mutations_tcga_plot(image_list, melvin_state, "bar");
        add_mutations_tcga_plot(image_list, compare_params, "bar");


    } else if (!_.isEmpty(melvin_state[MelvinAttributes.GENE_NAME])
        && !_.isEmpty(melvin_state[MelvinAttributes.STUDY_ABBRV])) {
            
        add_mutations_tcga_plot(image_list, melvin_state, "profile");
        add_mutations_tcga_plot(image_list, compare_params, "profile");

    }

    await add_to_APL_image_pager(handlerInput, image_list);
    return build_ssml_response_from_nunjucks("mutations/mutation_compare_tcga.njk", nunjucks_context, opts);
}

const add_mutations_tcga_plot = function (image_list, params, style) {
    const count_plot_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/tcga/MUT_plot`);
    add_query_params(count_plot_url, params);
    if (style) {
        count_plot_url.searchParams.set("style", style);
    }
    image_list.push(count_plot_url);
};

async function build_mutations_response(handlerInput, params, opts={}) {
    console.info(`[build_mutations_response] params: ${JSON.stringify(params)}`);
    let response = {};
    if (params[MelvinAttributes.DSOURCE] === DataSources.TCGA) {
        response = await build_mutations_tcga_response(handlerInput, params, opts);

    } else if (params[MelvinAttributes.DSOURCE] === DataSources.CLINVAR) {
        throw melvin_error(
            `[build_mutations_response] not implemented: ${JSON.stringify(params)}`,
            MelvinIntentErrors.NOT_IMPLEMENTED,
            DEFAULT_NOT_IMPLEMENTED_RESPONSE
        );

    } else {
        throw melvin_error(
            `[build_mutations_response] invalid state: ${JSON.stringify(params)}`,
            MelvinIntentErrors.INVALID_STATE,
            DEFAULT_INVALID_STATE_RESPONSE
        );
    }
    return response;
}

async function build_mutations_domain_response(handlerInput, params, opts={}) {
    console.info(`[build_mutations_domain_response] params: ${JSON.stringify(params)}`);
    let response = {};
    if (params[MelvinAttributes.DSOURCE] === DataSources.TCGA) {
        response = await build_mutations_tcga_domain_response(handlerInput, params, opts);

    } else if (params[MelvinAttributes.DSOURCE] === DataSources.CLINVAR) {
        throw melvin_error(
            `[build_mutations_domain_response] not implemented: ${JSON.stringify(params)}`,
            MelvinIntentErrors.NOT_IMPLEMENTED,
            DEFAULT_NOT_IMPLEMENTED_RESPONSE
        );

    } else {
        throw melvin_error(
            `[build_mutations_domain_response] invalid state: ${JSON.stringify(params)}`,
            MelvinIntentErrors.INVALID_STATE,
            DEFAULT_INVALID_STATE_RESPONSE
        );
    }
    return response;
}

async function build_mutations_compare_response(handlerInput, params, compare_params, state_diff, opts={}) {
    console.info(`[build_mutations_compare_response] params: ${JSON.stringify(params)}`);
    let response = {};
    if (params[MelvinAttributes.DSOURCE] === DataSources.TCGA) {
        response = await build_mutations_compare_tcga_response(handlerInput, params, compare_params, state_diff, opts);

    } else if (params[MelvinAttributes.DSOURCE] === DataSources.CLINVAR) {
        throw melvin_error(
            `[build_mutations_compare_response] not implemented: ${JSON.stringify(params)}`,
            MelvinIntentErrors.NOT_IMPLEMENTED,
            DEFAULT_NOT_IMPLEMENTED_RESPONSE
        );

    } else {
        throw melvin_error(
            `[build_mutations_compare_response] invalid state: ${JSON.stringify(params)}`,
            MelvinIntentErrors.INVALID_STATE,
            DEFAULT_INVALID_STATE_RESPONSE
        );
    }
    return response;
}

module.exports = {
    build_mutations_response,
    build_mutations_domain_response,
    build_mutations_compare_response
};
