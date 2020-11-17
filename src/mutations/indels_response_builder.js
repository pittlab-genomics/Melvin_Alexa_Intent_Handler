const _ = require("lodash");

const {
    MelvinAttributes,
    MelvinIntentErrors,
    DataSources,
    DataTypes,
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
    get_mutations_tcga_domain_stats,
    get_indels_tcga_stats,
    get_indels_tcga_domain_stats
} = require("../http_clients/melvin_explorer_client.js");
const { get_mutations_clinvar_stats } = require("../http_clients/melvin_explorer_client.js");


async function build_indels_tcga_response(handlerInput, melvin_state) {
    const image_list = [];
    const response = await get_indels_tcga_stats(handlerInput, melvin_state);
    const nunjucks_context = {
        melvin_state: melvin_state,
        response: response
    };
    const speech_ssml = build_ssml_response_from_nunjucks("mutations/indels_tcga.njk", nunjucks_context);

    if (!_.isEmpty(melvin_state[MelvinAttributes.GENE_NAME])
        && _.isEmpty(melvin_state[MelvinAttributes.STUDY_ABBRV])) {
        melvin_state[MelvinAttributes.STYLE] = 'bar';
        add_indels_tcga_plot(image_list, melvin_state);
        melvin_state[MelvinAttributes.STYLE] = 'treemap';
        add_indels_tcga_plot(image_list, melvin_state);
    } else if (_.isEmpty(melvin_state[MelvinAttributes.GENE_NAME])
        && !_.isEmpty(melvin_state[MelvinAttributes.STUDY_ABBRV])) {
        melvin_state[MelvinAttributes.STYLE] = 'bar';
        add_indels_tcga_plot(image_list, melvin_state);
    } else if (!_.isEmpty(melvin_state[MelvinAttributes.GENE_NAME])
        && !_.isEmpty(melvin_state[MelvinAttributes.STUDY_ABBRV])) {
        melvin_state[MelvinAttributes.STYLE] = 'profile';
        add_indels_tcga_plot(image_list, melvin_state);
    }

    // if (!_.isEmpty(melvin_state[MelvinAttributes.GENE_NAME]) 
    //     && _.isEmpty(melvin_state[MelvinAttributes.STUDY_ABBRV])) {
    //     add_mutations_tcga_stats_plot(image_list, melvin_state);
    //     add_mutations_tcga_treemap_plot(image_list, melvin_state);
    // } else if (_.isEmpty(melvin_state[MelvinAttributes.GENE_NAME]) 
    //     && !_.isEmpty(melvin_state[MelvinAttributes.STUDY_ABBRV])) {
    //     add_mutations_tcga_stats_plot(image_list, melvin_state);
    // } else if (!_.isEmpty(melvin_state[MelvinAttributes.GENE_NAME]) 
    //     && !_.isEmpty(melvin_state[MelvinAttributes.STUDY_ABBRV])) {
    //     add_mutations_tcga_profile_plot(image_list, melvin_state);
    // }    
    add_to_APL_image_pager(handlerInput, image_list);

    return { "speech_text": speech_ssml };
}

async function build_indels_tcga_domain_response(handlerInput, melvin_state) {
    const image_list = [];
    melvin_state[MelvinAttributes.STYLE] = 'domain';
    const response = await get_indels_tcga_domain_stats(handlerInput, melvin_state);
    const records_list = response["data"]["records"].filter(item => item["domain"] !== "none");
    const nunjucks_context = {
        melvin_state: melvin_state,
        response: response,
        records_list: records_list
    };
    const speech_ssml = build_ssml_response_from_nunjucks("mutations/indels_tcga.njk", nunjucks_context);

    // if (!_.isEmpty(melvin_state[MelvinAttributes.GENE_NAME]) 
    //     && _.isEmpty(melvin_state[MelvinAttributes.STUDY_ABBRV])) {
    //     add_mutations_tcga_domain_pie_plot(image_list, melvin_state);
    //     add_mutations_tcga_domain_stack_plot(image_list, melvin_state);
    // } else 
    if (!_.isEmpty(melvin_state[MelvinAttributes.GENE_NAME])
        && !_.isEmpty(melvin_state[MelvinAttributes.STUDY_ABBRV])) {
        melvin_state[MelvinAttributes.STYLE] = 'dompie';
        add_indels_tcga_plot(image_list, melvin_state);
        melvin_state[MelvinAttributes.STYLE] = 'domstack';
        add_indels_tcga_plot(image_list, melvin_state);
    }
    add_to_APL_image_pager(handlerInput, image_list);

    return { "speech_text": speech_ssml };
}

async function build_indels_compare_tcga_response(handlerInput, melvin_state, compare_params, sate_diff) {
    const image_list = [];
    const results = await Promise.all([
        get_indels_tcga_stats(handlerInput, melvin_state),
        get_indels_tcga_stats(handlerInput, compare_params)
    ]);
    const nunjucks_context = {
        melvin_state: melvin_state,
        compare_params: compare_params,
        sate_diff: sate_diff,
        response: results[0],
        compare_response: results[1]
    };
    const speech_ssml = build_ssml_response_from_nunjucks("mutations/mutation_compare_tcga.njk", nunjucks_context);

    if (!_.isEmpty(melvin_state[MelvinAttributes.GENE_NAME])
        && _.isEmpty(melvin_state[MelvinAttributes.STUDY_ABBRV])) {
        add_mutations_tcga_stats_plot(image_list, melvin_state);
        add_mutations_tcga_treemap_plot(image_list, melvin_state);

        add_mutations_tcga_stats_plot(image_list, compare_params);
        add_mutations_tcga_treemap_plot(image_list, compare_params);
    } else if (_.isEmpty(melvin_state[MelvinAttributes.GENE_NAME])
        && !_.isEmpty(melvin_state[MelvinAttributes.STUDY_ABBRV])) {
        add_mutations_tcga_stats_plot(image_list, melvin_state);
        add_mutations_tcga_stats_plot(image_list, compare_params);
    } else if (!_.isEmpty(melvin_state[MelvinAttributes.GENE_NAME])
        && !_.isEmpty(melvin_state[MelvinAttributes.STUDY_ABBRV])) {
        add_mutations_tcga_profile_plot(image_list, melvin_state);
        add_mutations_tcga_profile_plot(image_list, compare_params);
    }
    add_to_APL_image_pager(handlerInput, image_list);

    return { "speech_text": speech_ssml };
}

async function build_indels_clinvar_response(handlerInput, params) {
    const image_list = [];
    const response = await get_indels_clinvar_stats(handlerInput, params);
    const nunjucks_context = {
        melvin_state: params,
        response: response
    };
    const speech_ssml = build_ssml_response_from_nunjucks("mutations/mutations_clinvar.njk", nunjucks_context);

    if (!_.isEmpty(params[MelvinAttributes.GENE_NAME]) && !_.isEmpty(params[MelvinAttributes.STUDY_ABBRV])) {
        add_mutations_clinvar_stats_plot(image_list, params);
    }
    add_to_APL_image_pager(handlerInput, image_list);

    return { "speech_text": speech_ssml };
}


const add_indels_tcga_plot = function (image_list, params) {
    const count_plot_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/tcga/indel_plot`);
    add_query_params(count_plot_url, params);
    image_list.push(count_plot_url);
};







const add_mutations_tcga_stats_plot = function (image_list, params) {
    const count_plot_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/tcga/stats_plot`);
    add_query_params(count_plot_url, params);
    image_list.push(count_plot_url);
};

const add_mutations_tcga_treemap_plot = function (image_list, params) {
    const count_treemap_plot_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/tcga/treemap_plot`);
    add_query_params(count_treemap_plot_url, params);
    image_list.push(count_treemap_plot_url);
};

const add_mutations_tcga_profile_plot = function (image_list, params) {
    const profile_plot_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/tcga/profile_plot`);
    add_query_params(profile_plot_url, params);
    image_list.push(profile_plot_url);
};

const add_mutations_tcga_domain_pie_plot = function (image_list, params) {
    const domain_pie_plot_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/tcga/domain_pie_plot`);
    add_query_params(domain_pie_plot_url, params);
    image_list.push(domain_pie_plot_url);
};

const add_mutations_tcga_domain_stack_plot = function (image_list, params) {
    const domain_stack_plot_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/tcga/domain_stack_plot`);
    add_query_params(domain_stack_plot_url, params);
    image_list.push(domain_stack_plot_url);
};

const add_mutations_clinvar_stats_plot = function (image_list, params) {
    const count_plot_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/clinvar/plot`);
    add_query_params(count_plot_url, params);
    image_list.push(count_plot_url);
};

async function build_indels_response(handlerInput, params) {
    console.info(`[build_indels_response] params: ${JSON.stringify(params)}`);
    let response = {};
    if (params[MelvinAttributes.DSOURCE] === DataSources.TCGA) {
        response = await build_indels_tcga_response(handlerInput, params);

    } else if (params[MelvinAttributes.DSOURCE] === DataSources.CLINVAR) {
        response = await build_indels_clinvar_response(handlerInput, params);

    } else {
        throw melvin_error(
            `[build_indels_response] invalid state: ${JSON.stringify(params)}`,
            MelvinIntentErrors.INVALID_STATE,
            DEFAULT_INVALID_STATE_RESPONSE
        );
    }
    return response;
}

async function build_indels_domain_response(handlerInput, params) {
    params[MelvinAttributes.STYLE]='domain';
    console.info(`[build_indels_domain_response] params: ${JSON.stringify(params)}`);
    let response = {};
    if (params[MelvinAttributes.DSOURCE] === DataSources.TCGA) {
        response = await build_indels_tcga_domain_response(handlerInput, params);

    } else if (params[MelvinAttributes.DSOURCE] === DataSources.CLINVAR) {
        throw melvin_error(
            `[build_indels_domain_response] not implemented: ${JSON.stringify(params)}`,
            MelvinIntentErrors.NOT_IMPLEMENTED,
            DEFAULT_NOT_IMPLEMENTED_RESPONSE
        );

    } else {
        throw melvin_error(
            `[build_indels_domain_response] invalid state: ${JSON.stringify(params)}`,
            MelvinIntentErrors.INVALID_STATE,
            DEFAULT_INVALID_STATE_RESPONSE
        );
    }
    return response;
}

async function build_indels_compare_response(handlerInput, params, compare_params, sate_diff) {
    console.info(`[build_indels_compare_response] params: ${JSON.stringify(params)}`);
    let response = {};
    if (params[MelvinAttributes.DSOURCE] === DataSources.TCGA) {
        response = await build_indels_compare_tcga_response(handlerInput, params, compare_params, sate_diff);

    } else if (params[MelvinAttributes.DSOURCE] === DataSources.CLINVAR) {
        throw melvin_error(
            `[build_indels_compare_response] not implemented: ${JSON.stringify(params)}`,
            MelvinIntentErrors.NOT_IMPLEMENTED,
            DEFAULT_NOT_IMPLEMENTED_RESPONSE
        );

    } else {
        throw melvin_error(
            `[build_indels_compare_response] invalid state: ${JSON.stringify(params)}`,
            MelvinIntentErrors.INVALID_STATE,
            DEFAULT_INVALID_STATE_RESPONSE
        );
    }
    return response;
}

module.exports = {
    build_indels_response,
    build_indels_domain_response,
    build_indels_compare_response
};