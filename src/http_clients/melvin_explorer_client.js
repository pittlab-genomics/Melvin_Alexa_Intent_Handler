"use strict";

const AWS = require("aws-sdk");
const fetch = require("node-fetch");
const AbortController = require("abort-controller");
const https = require("https");
const { performance } = require("perf_hooks");

const {
    MelvinIntentErrors,
    melvin_error,
    DEFAULT_AE_ACCESS_ERROR_RESPONSE,
    DEFAULT_AE_CONNECT_ERROR_RESPONSE,
    MELVIN_EXPLORER_ENDPOINT
} = require("../common.js");

const {
    add_query_params, add_query_list_params, call_directive_service
} = require("../utils/response_builder_utils.js");

const agent = new https.Agent({ maxSockets: 100 });
AWS.config.update({ httpOptions: { agent: agent }});

const ae_timeout_1 = 1800;
const ae_timeout_2 = 7000;


const send_request_async = function(url, signal) {
    console.info(`[send_request_async] AE url: ${url.href}`);
    return fetch(url, {
        signal, agent 
    }).then((response) => {
        if (response.ok) {
            return response.json();
        } else {
            throw melvin_error(
                `[send_request_async] AE response not ok | ${JSON.stringify(response)}`,
                MelvinIntentErrors.INVALID_API_RESPOSE,
                DEFAULT_AE_ACCESS_ERROR_RESPONSE
            );
        }
    }).catch((err) => {
        throw melvin_error(
            `[send_request_async] AE connect error: ${JSON.stringify(err)}`,
            MelvinIntentErrors.INVALID_API_RESPOSE,
            DEFAULT_AE_CONNECT_ERROR_RESPONSE
        );
    });
};

const process_repeat_requests = async function(handlerInput, url, timeout1=ae_timeout_1, timeout2=ae_timeout_2) {
    const controller_short = new AbortController();
    const signal_short = controller_short.signal;
    setTimeout(() => { 
        controller_short.abort();
    }, timeout1);

    const t1 = performance.now();
    try {        
        const result = await send_request_async(url, signal_short);
        const t2 = performance.now();
        console.log("[process_repeat_requests] first AE request took " + (t2 - t1) + " ms");
        return result;
    } catch(err) {
        const t3 = performance.now();
        console.error("[process_repeat_requests] first AE request failed and took " + (t3 - t1) +
            ` ms | err: ${JSON.stringify(err)}`);
    }

    try {
        // send Alexa progressive response to indicate that this is going to take little longer
        const pr_speech = "I'm still working on it, please wait.";
        await call_directive_service(handlerInput, pr_speech);
    } catch(err) {
        // ignore errors when invoking progressive response API
        console.error("[process_repeat_requests] failed to send PR", err);
    }
    
    const controller_long = new AbortController();
    const signal_long = controller_long.signal;
    setTimeout(() => { 
        controller_long.abort();
    }, timeout2);
    
    const t4 = performance.now();
    try {        
        const result = await send_request_async(url, signal_long);
        const t5 = performance.now();
        console.log("[process_repeat_requests] second AE request took " + (t5 - t4) + " ms");
        return result;
    } catch(err) {
        const t6 = performance.now();
        console.error("[process_repeat_requests] second AE request failed and took " + (t6 - t4) +
            ` ms | err: ${JSON.stringify(err)}`);
        throw err;
    }
};


const get_mutations_tcga_stats = async function (handlerInput, params) {
    const mutations_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/tcga/stats`);
    add_query_params(mutations_url, params);
    const result = await process_repeat_requests(handlerInput, mutations_url);
    return result;
};

const get_mutations_tcga_top_genes = async function (handlerInput, params) {
    const mutations_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/tcga/top_genes`);
    add_query_params(mutations_url, params);
    const result = await process_repeat_requests(handlerInput, mutations_url);
    return result;
};

const get_mutations_tcga_domain_stats = async function (handlerInput, params) {
    const mutations_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/tcga/domain_stats`);
    add_query_params(mutations_url, params);
    const result = await process_repeat_requests(handlerInput, mutations_url);
    return result;
};

const get_clinical_trials = async function (handlerInput, params) {
    const clinical_trials_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/clinical_trials/list`);
    add_query_list_params(clinical_trials_url, params, ["location", "distance", "study"]);
    add_query_params(clinical_trials_url, params);
    const result = await process_repeat_requests(handlerInput, clinical_trials_url);
    return result;
};

const get_cna_clinvar_stats = async function (handlerInput, params) {
    const cna_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/cna/clinvar/stats`);
    add_query_params(cna_url, params);
    const result = await process_repeat_requests(handlerInput, cna_url);
    return result;
};

const get_cna_tcga_stats = async function (handlerInput, params) {
    const cna_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/cna/tcga/cna_stats`);
    add_query_params(cna_url, params);
    const result = await process_repeat_requests(handlerInput, cna_url);
    return result;
};

const get_gain_tcga_stats = async function (handlerInput, params) {
    const gain_stats_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/cna/tcga/gain_stats`);
    add_query_params(gain_stats_url, params);
    const result = await process_repeat_requests(handlerInput, gain_stats_url);
    return result;
};

const get_loss_tcga_stats = async function (handlerInput, params) {
    const loss_stats_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/cna/tcga/loss_stats`);
    add_query_params(loss_stats_url, params);
    const result = await process_repeat_requests(handlerInput, loss_stats_url);
    return result;
};

const get_gene_by_name = async function (handlerInput, params) {
    const gene_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/genes/${params.gene_name}`);
    const result = await process_repeat_requests(handlerInput, gene_url);
    return result;
};

const get_gene_expression_clinvar_stats = async function (handlerInput, params) {
    const gene_expression_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/gene_expression/clinvar/stats`);
    add_query_params(gene_expression_url, params);
    const result = await process_repeat_requests(handlerInput, gene_expression_url);
    return result;
};

const get_gene_expression_tcga_stats = async function (handlerInput, params) {
    const gene_expression_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/gene_expression/tcga/stats`);
    add_query_params(gene_expression_url, params);
    const result = await process_repeat_requests(handlerInput, gene_expression_url);
    return result;
};

const get_mutations_clinvar_stats = async function (handlerInput, params) {
    const mutations_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/clinvar/stats`);
    add_query_params(mutations_url, params);
    const result = await process_repeat_requests(handlerInput, mutations_url);
    return result;
};

const get_splitby_tcga_stats = async function (handlerInput, melvin_state, splitby_state) {
    const splitby_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/splitby/tcga/stats`);
    splitby_url.searchParams.set("melvin_state", JSON.stringify(melvin_state));
    splitby_url.searchParams.set("splitby_state", JSON.stringify(splitby_state));
    const result = await process_repeat_requests(handlerInput, splitby_url);
    return result;
};

const get_sv_clinvar_stats = async function (handlerInput, params) {
    const sv_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/structural_variants/clinvar/stats`);
    add_query_params(sv_url, params);
    const result = await process_repeat_requests(handlerInput, sv_url);
    return result;
};

module.exports = {
    get_mutations_tcga_stats,
    get_mutations_tcga_top_genes,
    get_mutations_tcga_domain_stats,
    get_cna_tcga_stats,
    get_gain_tcga_stats,
    get_loss_tcga_stats,
    get_gene_expression_tcga_stats,
    get_splitby_tcga_stats,
    get_mutations_clinvar_stats,
    get_cna_clinvar_stats,
    get_gene_expression_clinvar_stats,
    get_sv_clinvar_stats,
    get_clinical_trials,    
    get_gene_by_name
};