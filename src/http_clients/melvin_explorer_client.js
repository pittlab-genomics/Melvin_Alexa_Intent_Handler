"use strict";

const _ = require("lodash");
const AWS = require("aws-sdk");
const sigv4_utils = require("../utils/sigv4_utils");
const fetch = require("node-fetch");
const AbortController = require("abort-controller");
const https = require("https");
const { performance } = require("perf_hooks");

const {
    MelvinIntentErrors,
    melvin_error,
    DEFAULT_AE_ACCESS_ERROR_RESPONSE,
    DEFAULT_AE_CONNECT_ERROR_RESPONSE,
    MELVIN_EXPLORER_ENDPOINT,
    MELVIN_EXPLORER_ROLE,
    MELVIN_EXPLORER_REGION,
    MelvinExplorerErrors
} = require("../common.js");

const {
    add_query_params, add_query_list_params, call_directive_service, build_ssml_response_from_nunjucks
} = require("../utils/response_builder_utils.js");

const agent = new https.Agent({ maxSockets: 100 });
AWS.config.update({ httpOptions: { agent: agent }});

const ae_timeout_1 = 2000;
const ae_timeout_2 = 10000;


const send_request_async = function(url, headers, signal) {
    console.info(`[send_request_async] AE url: ${url}`);
    return fetch(url, {
        headers, signal, agent
    }).then((response) => response.json()
    ).then((response) => {
        if(_.has(response, "data")) {
            return response;
        } else if(_.has(response, "error")) {
            console.log(`${JSON.stringify(response)}`);
            if(response["error"] === MelvinExplorerErrors.DATA_IS_ZERO) {
                let description = "There is no data in the database.";
                if(response.description != null) {
                    description = response["description"];
                    if(!description.trim().endsWith(".")) description += ".";
                }
                throw melvin_error(`[send_request_async] Data is zero error: ${JSON.stringify(response)}`,
                    MelvinExplorerErrors.DATA_IS_ZERO,
                    description);   
            } else {
                console.log(`${JSON.stringify(response)}`);
                throw melvin_error(
                    `[send_request_async] AE response not ok | ${JSON.stringify(response)}`,
                    MelvinIntentErrors.INVALID_API_RESPONSE,
                    DEFAULT_AE_ACCESS_ERROR_RESPONSE
                );
            }
        } else {
            console.log(`${JSON.stringify(response)}`);
            throw melvin_error(
                `[send_request_async] AE response not ok | ${JSON.stringify(response)}`,
                MelvinIntentErrors.INVALID_API_RESPONSE,
                DEFAULT_AE_ACCESS_ERROR_RESPONSE
            );
        }
    }).catch((err) => {
        throw melvin_error(
            `[send_request_async] Melvin Explorer error: ${JSON.stringify(err)}`,
            (err.type)? err.type : MelvinIntentErrors.INVALID_API_RESPONSE,
            (err.speech)? err.speech : DEFAULT_AE_CONNECT_ERROR_RESPONSE
        );
    });
};

const process_repeat_requests = async function(handlerInput, url, headers, timeout1=ae_timeout_1, 
    timeout2=ae_timeout_2) {
    const controller_short = new AbortController();
    const signal_short = controller_short.signal;
    setTimeout(() => { 
        controller_short.abort();
    }, timeout1);

    const t1 = performance.now();
    try {        
        const result = await send_request_async(url, headers, signal_short);
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
        const result = await send_request_async(url, headers, signal_long);
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

const get_mutations_tcga_top_genes = async function (handlerInput, params) {
    const mutations_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/tcga/top_genes`);
    add_query_params(mutations_url, params);
    const result = await process_repeat_requests(handlerInput, mutations_url);
    return result;
};

async function assumeRole() {
    var sts = new AWS.STS();
    try {
        const data = await sts.assumeRole({
            RoleArn:         MELVIN_EXPLORER_ROLE,
            RoleSessionName: "melvin_explorer_invoke"
        }).promise();
        console.log("[assumeRole] Assumed role success.");
        return data;
    } catch (err) {
        console.log("[assumeRole] Cannot assume role.");
        console.log(err, err.stack);
    }
}

async function signUrl(path, queryParams = {}, method="GET", headers={}) {
    const data = await assumeRole();
    const signedRequest = sigv4_utils.sigV4Client.newClient({
        accessKey:    data.Credentials.AccessKeyId,
        secretKey:    data.Credentials.SecretAccessKey,
        sessionToken: data.Credentials.SessionToken,
        region:       MELVIN_EXPLORER_REGION,
        endpoint:     MELVIN_EXPLORER_ENDPOINT
    }).signRequest({
        method, path, headers, queryParams
    });
    return signedRequest;

}

const get_mutations_tcga_stats = async function (handlerInput, params) {
    const mutations_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/tcga/MUT_stats`);
    const path = "/analysis/mutations/tcga/MUT_stats";
    var qparams = add_query_params(mutations_url, params);
    var signedRequest = await signUrl(path, qparams);
    try {
        const result = await process_repeat_requests(handlerInput, mutations_url, signedRequest.headers);
        return result;
    } catch(err) {
        if(err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
            const nunjucks_context = { melvin_state: params, };
            const speech_ssml = build_ssml_response_from_nunjucks("error/data_is_zero.njk", nunjucks_context);
            throw melvin_error(
                `[get_mutations_tcga_stats] Melvin Explorer error: ${JSON.stringify(err)}`,
                err.type,
                speech_ssml
            );
        }
        throw err;
    }
};

const get_mutations_tcga_domain_stats = async function (handlerInput, params) {
    const mutations_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/tcga/MUT_stats`);
    const path = "/analysis/mutations/tcga/MUT_stats";
    var qparams = add_query_params(mutations_url, params);
    mutations_url.searchParams.set("style", "domain");
    qparams.style = "domain";
    var signedRequest = await signUrl(path, qparams);
    try {
        const result = await process_repeat_requests(handlerInput, mutations_url, signedRequest.headers);
        return result;
    } catch(err) {
        if(err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
            const nunjucks_context = {
                melvin_state: params,
                subtype:      "domain",
            };
            const speech_ssml = build_ssml_response_from_nunjucks("error/data_is_zero.njk", nunjucks_context);
            throw melvin_error(
                `[get_mutations_tcga_domain_stats] Melvin Explorer error: ${JSON.stringify(err)}`,
                err.type,
                speech_ssml
            );
        }
        throw err;
    }
};

const get_indels_tcga_stats = async function (handlerInput, params) {
    const indels_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/tcga/IND_stats`);
    const path = "/analysis/mutations/tcga/IND_stats";
    var qparams = add_query_params(indels_url, params);
    var signedRequest = await signUrl(path, qparams);
    try {
        const result = await process_repeat_requests(handlerInput, indels_url, signedRequest.headers);
        return result;
    } catch(err) {
        if(err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
            const nunjucks_context = { melvin_state: params };
            const speech_ssml = build_ssml_response_from_nunjucks("error/data_is_zero.njk", nunjucks_context);
            throw melvin_error(
                `[get_indels_tcga_stats] Melvin Explorer error: ${JSON.stringify(err)}`,
                err.type,
                speech_ssml
            );
        }
        throw err;
    }
};

const get_indels_tcga_domain_stats = async function (handlerInput, params) {
    const indels_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/tcga/IND_stats`);
    const path = "/analysis/mutations/tcga/IND_stats";
    var qparams = add_query_params(indels_url, params);
    indels_url.searchParams.set("style", "domain");
    qparams.style = "domain";
    var signedRequest = await signUrl(path, qparams);
    try {
        const result = await process_repeat_requests(handlerInput, indels_url, signedRequest.headers);
        return result;
    } catch(err) {
        if(err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
            const nunjucks_context = {
                melvin_state: params,
                subtype:      "domain",
            };
            const speech_ssml = build_ssml_response_from_nunjucks("error/data_is_zero.njk", nunjucks_context);
            throw melvin_error(
                `[get_indels_tcga_domain_stats] Melvin Explorer error: ${JSON.stringify(err)}`,
                err.type,
                speech_ssml
            );
        }
        throw err;
    }
};

const get_snvs_tcga_stats = async function (handlerInput, params) {
    const snvs_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/tcga/SNV_stats`);
    const path = "/analysis/mutations/tcga/SNV_stats";
    var qparams = add_query_params(snvs_url, params);
    var signedRequest = await signUrl(path, qparams);
    try {
        const result = await process_repeat_requests(handlerInput, snvs_url, signedRequest.headers);
        return result;
    } catch(err) {
        if(err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
            const nunjucks_context = { melvin_state: params };
            const speech_ssml = build_ssml_response_from_nunjucks("error/data_is_zero.njk", nunjucks_context);
            throw melvin_error(
                `[get_snvs_tcga_stats] Melvin Explorer error: ${JSON.stringify(err)}`,
                err.type,
                speech_ssml
            );
        }
        throw err;
    }
};

const get_snvs_tcga_domain_stats = async function (handlerInput, params) {
    const snvs_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/tcga/SNV_stats`);
    const path = "/analysis/mutations/tcga/SNV_stats";
    var qparams = add_query_params(snvs_url, params);
    snvs_url.searchParams.set("style", "domain");
    qparams.style = "domain";
    var signedRequest = await signUrl(path, qparams);
    try {
        const result = await process_repeat_requests(handlerInput, snvs_url, signedRequest.headers);
        return result;
    } catch(err) {
        if(err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
            const nunjucks_context = {
                melvin_state: params,
                subtype:      "domain"
            };
            const speech_ssml = build_ssml_response_from_nunjucks("error/data_is_zero.njk", nunjucks_context);
            throw melvin_error(
                `[get_snvs_tcga_domain_stats] Melvin Explorer error: ${JSON.stringify(err)}`,
                err.type,
                speech_ssml
            );
        }
        throw err;
    }
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
    const path = "/analysis/cna/tcga/cna_stats";
    var qparams = add_query_params(cna_url, params);
    var signedRequest = await signUrl(path, qparams);
    try {
        const result = await process_repeat_requests(handlerInput, cna_url, signedRequest.headers);
        return result;
    } catch(err) {
        if(err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
            const nunjucks_context = { melvin_state: params, };
            const speech_ssml = build_ssml_response_from_nunjucks("error/data_is_zero.njk", nunjucks_context);
            throw melvin_error(
                `[get_cna_tcga_stats] Melvin Explorer error: ${JSON.stringify(err)}`,
                err.type,
                speech_ssml
            );
        }
        throw err;
    }
};

const get_gain_tcga_stats = async function (handlerInput, params) {
    const gain_stats_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/cna/tcga/gain_stats`);
    const path = "/analysis/cna/tcga/gain_stats";
    var qparams = add_query_params(gain_stats_url, params);
    var signedRequest = await signUrl(path, qparams);
    try {
        const result = await process_repeat_requests(handlerInput, gain_stats_url, signedRequest.headers);
        return result;
    } catch(err) {
        if(err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
            const nunjucks_context = { melvin_state: params, };
            const speech_ssml = build_ssml_response_from_nunjucks("error/data_is_zero.njk", nunjucks_context);
            throw melvin_error(
                `[get_gain_tcga_stats] Melvin Explorer error: ${JSON.stringify(err)}`,
                err.type,
                speech_ssml
            );
        }
        throw err;
    }
};

const get_loss_tcga_stats = async function (handlerInput, params) {
    const loss_stats_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/cna/tcga/loss_stats`);
    const path = "/analysis/cna/tcga/loss_stats";
    var qparams = add_query_params(loss_stats_url, params);
    var signedRequest = await signUrl(path, qparams);
    try {
        const result = await process_repeat_requests(handlerInput, loss_stats_url, signedRequest.headers);
        return result;
    } catch(err) {
        if(err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
            const nunjucks_context = { melvin_state: params, };
            const speech_ssml = build_ssml_response_from_nunjucks("error/data_is_zero.njk", nunjucks_context);
            throw melvin_error(
                `[get_loss_tcga_stats] Melvin Explorer error: ${JSON.stringify(err)}`,
                err.type,
                speech_ssml
            );
        }
        throw err;
    }
};

const get_gene_by_name = async function (handlerInput, params) {
    const gene_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/genes/${params.gene_name}`);
    const path = `/genes/${params.gene_name}`;
    var signedRequest = await signUrl(path);
    const result = await process_repeat_requests(handlerInput, gene_url, signedRequest.headers);
    return result;
};

const get_gene_target = async function (handlerInput, params) {
    const gene_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/gene_targets/${params.gene_name}`);
    const path = `/gene_targets/${params.gene_name}`;
    var signedRequest = await signUrl(path);
    try {
        const result = await process_repeat_requests(handlerInput, gene_url, signedRequest.headers);
        return result;
    } catch(err) {
        if(err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
            const nunjucks_context = { melvin_state: params };
            const speech_ssml = build_ssml_response_from_nunjucks("error/data_is_zero.njk", nunjucks_context);
            throw melvin_error(
                `[get_gene_target] Melvin Explorer error: ${JSON.stringify(err)}`,
                err.type,
                speech_ssml
            );
        }
        throw err;
    }
};

const get_gene_expression_clinvar_stats = async function (handlerInput, params) {
    const gene_expression_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/gene_expression/clinvar/stats`);
    add_query_params(gene_expression_url, params);
    const result = await process_repeat_requests(handlerInput, gene_expression_url);
    return result;
};

const get_gene_expression_tcga_stats = async function (handlerInput, params) {
    const gene_expression_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/gene_expression/tcga/stats`);
    const path = "/analysis/gene_expression/tcga/stats";
    var qparams = add_query_params(gene_expression_url, params);
    var signedRequest = await signUrl(path, qparams);
    try {
        const result = await process_repeat_requests(handlerInput, gene_expression_url, signedRequest.headers);
        return result;
    } catch(err) {
        if(err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
            const nunjucks_context = { melvin_state: params, };
            const speech_ssml = build_ssml_response_from_nunjucks("error/data_is_zero.njk", nunjucks_context);
            throw melvin_error(
                `[get_gene_expression_tcga_stats] Melvin Explorer error: ${JSON.stringify(err)}`,
                err.type,
                speech_ssml
            );
        }
        throw err;
    }
};

const get_mutations_clinvar_stats = async function (handlerInput, params) {
    const mutations_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/clinvar/stats`);
    add_query_params(mutations_url, params);
    const result = await process_repeat_requests(handlerInput, mutations_url);
    return result;
};

const get_gain_gain_splitby_tcga_stats = async function (handlerInput, melvin_state, splitby_state) {
    const splitby_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/splitby/tcga/GAINsGAIN_stats`);
    splitby_url.searchParams.set("melvin_state", JSON.stringify(melvin_state));
    splitby_url.searchParams.set("splitby_state", JSON.stringify(splitby_state));
    const path = "/analysis/splitby/tcga/GAINsGAIN_stats";
    let qparams = {
        melvin_state:  JSON.stringify(melvin_state),
        splitby_state: JSON.stringify(splitby_state)
    };
    var signedRequest = await signUrl(path, qparams);
    try {
        const result = await process_repeat_requests(handlerInput, splitby_url, signedRequest.headers);
        return result;
    } catch(err) {
        if(err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
            const nunjucks_context = {
                melvin_state: melvin_state, splitby_state: splitby_state 
            };
            const speech_ssml = build_ssml_response_from_nunjucks("error/splitby_data_is_zero.njk", nunjucks_context);
            throw melvin_error(
                `[get_gain_gain_splitby_tcga_stats] Melvin Explorer error: ${JSON.stringify(err)}`,
                err.type,
                speech_ssml
            );
        }
        throw err;
    }
};

const get_gain_loss_splitby_tcga_stats = async function (handlerInput, melvin_state, splitby_state) {
    const splitby_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/splitby/tcga/GAINsLOSS_stats`);
    splitby_url.searchParams.set("melvin_state", JSON.stringify(melvin_state));
    splitby_url.searchParams.set("splitby_state", JSON.stringify(splitby_state));
    const path = "/analysis/splitby/tcga/GAINsLOSS_stats";
    let qparams = {
        melvin_state:  JSON.stringify(melvin_state),
        splitby_state: JSON.stringify(splitby_state)
    };
    var signedRequest = await signUrl(path, qparams);
    try {
        const result = await process_repeat_requests(handlerInput, splitby_url, signedRequest.headers);
        return result;
    } catch(err) {
        if(err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
            const nunjucks_context = {
                melvin_state: melvin_state, splitby_state: splitby_state 
            };
            const speech_ssml = build_ssml_response_from_nunjucks("error/splitby_data_is_zero.njk", nunjucks_context);
            throw melvin_error(
                `[get_gain_loss_splitby_tcga_stats] Melvin Explorer error: ${JSON.stringify(err)}`,
                err.type,
                speech_ssml
            );
        }
        throw err;
    }
    
};

const get_loss_loss_splitby_tcga_stats = async function (handlerInput, melvin_state, splitby_state) {
    const splitby_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/splitby/tcga/LOSSsLOSS_stats`);
    splitby_url.searchParams.set("melvin_state", JSON.stringify(melvin_state));
    splitby_url.searchParams.set("splitby_state", JSON.stringify(splitby_state));
    const path = "/analysis/splitby/tcga/LOSSsLOSS_stats";
    let qparams = {
        melvin_state:  JSON.stringify(melvin_state),
        splitby_state: JSON.stringify(splitby_state)
    };
    var signedRequest = await signUrl(path, qparams);
    try {
        const result = await process_repeat_requests(handlerInput, splitby_url, signedRequest.headers);
        return result;
    } catch(err) {
        if(err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
            const nunjucks_context = {
                melvin_state: melvin_state, splitby_state: splitby_state 
            };
            const speech_ssml = build_ssml_response_from_nunjucks("error/splitby_data_is_zero.njk", nunjucks_context);
            throw melvin_error(
                `[get_loss_loss_splitby_tcga_stats] Melvin Explorer error: ${JSON.stringify(err)}`,
                err.type,
                speech_ssml
            );
        }
        throw err;
    }
};

const get_cna_cna_splitby_tcga_stats = async function (handlerInput, melvin_state, splitby_state) {
    const splitby_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/splitby/tcga/CNAsCNA_stats`);
    splitby_url.searchParams.set("melvin_state", JSON.stringify(melvin_state));
    splitby_url.searchParams.set("splitby_state", JSON.stringify(splitby_state));
    const path = "/analysis/splitby/tcga/CNAsCNA_stats";
    let qparams = {
        melvin_state:  JSON.stringify(melvin_state),
        splitby_state: JSON.stringify(splitby_state)
    };
    var signedRequest = await signUrl(path, qparams);
    try {
        const result = await process_repeat_requests(handlerInput, splitby_url, signedRequest.headers);
        return result;
    } catch(err) {
        if(err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
            const nunjucks_context = {
                melvin_state: melvin_state, splitby_state: splitby_state 
            };
            const speech_ssml = build_ssml_response_from_nunjucks("error/splitby_data_is_zero.njk", nunjucks_context);
            throw melvin_error(
                `[get_cna_cna_splitby_tcga_stats] Melvin Explorer error: ${JSON.stringify(err)}`,
                err.type,
                speech_ssml
            );
        }
        throw err;
    }
};

const get_cna_gain_splitby_tcga_stats = async function (handlerInput, melvin_state, splitby_state) {
    const splitby_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/splitby/tcga/CNAsGAIN_stats`);
    splitby_url.searchParams.set("melvin_state", JSON.stringify(melvin_state));
    splitby_url.searchParams.set("splitby_state", JSON.stringify(splitby_state));
    const path = "/analysis/splitby/tcga/CNAsGAIN_stats";
    let qparams = {
        melvin_state:  JSON.stringify(melvin_state),
        splitby_state: JSON.stringify(splitby_state)
    };
    var signedRequest = await signUrl(path, qparams);
    try {
        const result = await process_repeat_requests(handlerInput, splitby_url, signedRequest.headers);
        return result;
    } catch(err) {
        if(err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
            const nunjucks_context = {
                melvin_state: melvin_state, splitby_state: splitby_state 
            };
            const speech_ssml = build_ssml_response_from_nunjucks("error/splitby_data_is_zero.njk", nunjucks_context);
            throw melvin_error(
                `[get_cna_gain_splitby_tcga_stats] Melvin Explorer error: ${JSON.stringify(err)}`,
                err.type,
                speech_ssml
            );
        }
        throw err;
    }
};

const get_cna_loss_splitby_tcga_stats = async function (handlerInput, melvin_state, splitby_state) {
    const splitby_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/splitby/tcga/CNAsLOSS_stats`);
    splitby_url.searchParams.set("melvin_state", JSON.stringify(melvin_state));
    splitby_url.searchParams.set("splitby_state", JSON.stringify(splitby_state));
    const path = "/analysis/splitby/tcga/CNAsLOSS_stats";
    let qparams = {
        melvin_state:  JSON.stringify(melvin_state),
        splitby_state: JSON.stringify(splitby_state)
    };
    var signedRequest = await signUrl(path, qparams);
    try {
        const result = await process_repeat_requests(handlerInput, splitby_url, signedRequest.headers);
        return result;
    } catch(err) {
        if(err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
            const nunjucks_context = {
                melvin_state: melvin_state, splitby_state: splitby_state 
            };
            const speech_ssml = build_ssml_response_from_nunjucks("error/splitby_data_is_zero.njk", nunjucks_context);
            throw melvin_error(
                `[get_cna_loss_splitby_tcga_stats] Melvin Explorer error: ${JSON.stringify(err)}`,
                err.type,
                speech_ssml
            );
        }
        throw err;
    }
};

const get_ind_ind_splitby_tcga_stats = async function (handlerInput, melvin_state, splitby_state) {
    const splitby_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/splitby/tcga/INDsIND_stats`);
    splitby_url.searchParams.set("melvin_state", JSON.stringify(melvin_state));
    splitby_url.searchParams.set("splitby_state", JSON.stringify(splitby_state));
    const path = "/analysis/splitby/tcga/INDsIND_stats";
    let qparams = {
        melvin_state:  JSON.stringify(melvin_state),
        splitby_state: JSON.stringify(splitby_state)
    };
    var signedRequest = await signUrl(path, qparams);
    try {
        const result = await process_repeat_requests(handlerInput, splitby_url, signedRequest.headers);
        return result;
    } catch(err) {
        if(err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
            const nunjucks_context = {
                melvin_state: melvin_state, splitby_state: splitby_state 
            };
            const speech_ssml = build_ssml_response_from_nunjucks("error/splitby_data_is_zero.njk", nunjucks_context);
            throw melvin_error(
                `[get_ind_ind_splitby_tcga_stats] Melvin Explorer error: ${JSON.stringify(err)}`,
                err.type,
                speech_ssml
            );
        }
        throw err;
    }
};

const get_ind_cna_splitby_tcga_stats = async function (handlerInput, melvin_state, splitby_state) {
    const splitby_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/splitby/tcga/INDsCNA_stats`);
    splitby_url.searchParams.set("melvin_state", JSON.stringify(melvin_state));
    splitby_url.searchParams.set("splitby_state", JSON.stringify(splitby_state));
    const path = "/analysis/splitby/tcga/INDsCNA_stats";
    let qparams = {
        melvin_state:  JSON.stringify(melvin_state),
        splitby_state: JSON.stringify(splitby_state)
    };
    var signedRequest = await signUrl(path, qparams);
    try {
        const result = await process_repeat_requests(handlerInput, splitby_url, signedRequest.headers);
        return result;
    } catch(err) {
        if(err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
            const nunjucks_context = {
                melvin_state: melvin_state, splitby_state: splitby_state 
            };
            const speech_ssml = build_ssml_response_from_nunjucks("error/splitby_data_is_zero.njk", nunjucks_context);
            throw melvin_error(
                `[get_ind_cna_splitby_tcga_stats] Melvin Explorer error: ${JSON.stringify(err)}`,
                err.type,
                speech_ssml
            );
        }
        throw err;
    }
};

const get_ind_gain_splitby_tcga_stats = async function (handlerInput, melvin_state, splitby_state) {
    const splitby_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/splitby/tcga/INDsGAIN_stats`);
    splitby_url.searchParams.set("melvin_state", JSON.stringify(melvin_state));
    splitby_url.searchParams.set("splitby_state", JSON.stringify(splitby_state));
    const path = "/analysis/splitby/tcga/INDsGAIN_stats";
    let qparams = {
        melvin_state:  JSON.stringify(melvin_state),
        splitby_state: JSON.stringify(splitby_state)
    };
    var signedRequest = await signUrl(path, qparams);
    try {
        const result = await process_repeat_requests(handlerInput, splitby_url, signedRequest.headers);
        return result;
    } catch(err) {
        if(err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
            const nunjucks_context = {
                melvin_state: melvin_state, splitby_state: splitby_state 
            };
            const speech_ssml = build_ssml_response_from_nunjucks("error/splitby_data_is_zero.njk", nunjucks_context);
            throw melvin_error(
                `[get_ind_gain_splitby_tcga_stats] Melvin Explorer error: ${JSON.stringify(err)}`,
                err.type,
                speech_ssml
            );
        }
        throw err;
    }
};

const get_ind_loss_splitby_tcga_stats = async function (handlerInput, melvin_state, splitby_state) {
    const splitby_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/splitby/tcga/INDsLOSS_stats`);
    splitby_url.searchParams.set("melvin_state", JSON.stringify(melvin_state));
    splitby_url.searchParams.set("splitby_state", JSON.stringify(splitby_state));
    const path = "/analysis/splitby/tcga/INDsLOSS_stats";
    let qparams = {
        melvin_state:  JSON.stringify(melvin_state),
        splitby_state: JSON.stringify(splitby_state)
    };
    var signedRequest = await signUrl(path, qparams);
    try {
        const result = await process_repeat_requests(handlerInput, splitby_url, signedRequest.headers);
        return result;
    } catch(err) {
        if(err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
            const nunjucks_context = {
                melvin_state: melvin_state, splitby_state: splitby_state 
            };
            const speech_ssml = build_ssml_response_from_nunjucks("error/splitby_data_is_zero.njk", nunjucks_context);
            throw melvin_error(
                `[get_ind_loss_splitby_tcga_stats] Melvin Explorer error: ${JSON.stringify(err)}`,
                err.type,
                speech_ssml
            );
        }
        throw err;
    }
};

const get_snv_snv_splitby_tcga_stats = async function (handlerInput, melvin_state, splitby_state) {
    const splitby_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/splitby/tcga/SNVsSNV_stats`);
    splitby_url.searchParams.set("melvin_state", JSON.stringify(melvin_state));
    splitby_url.searchParams.set("splitby_state", JSON.stringify(splitby_state));
    const path = "/analysis/splitby/tcga/SNVsSNV_stats";
    let qparams = {
        melvin_state:  JSON.stringify(melvin_state),
        splitby_state: JSON.stringify(splitby_state)
    };
    var signedRequest = await signUrl(path, qparams);
    try {
        const result = await process_repeat_requests(handlerInput, splitby_url, signedRequest.headers);
        return result;
    } catch(err) {
        if(err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
            const nunjucks_context = {
                melvin_state: melvin_state, splitby_state: splitby_state 
            };
            const speech_ssml = build_ssml_response_from_nunjucks("error/splitby_data_is_zero.njk", nunjucks_context);
            throw melvin_error(
                `[get_snv_snv_splitby_tcga_stats] Melvin Explorer error: ${JSON.stringify(err)}`,
                err.type,
                speech_ssml
            );
        }
        throw err;
    }
};

const get_snv_ind_splitby_tcga_stats = async function (handlerInput, melvin_state, splitby_state) {
    const splitby_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/splitby/tcga/SNVsIND_stats`);
    splitby_url.searchParams.set("melvin_state", JSON.stringify(melvin_state));
    splitby_url.searchParams.set("splitby_state", JSON.stringify(splitby_state));
    const path = "/analysis/splitby/tcga/SNVsIND_stats";
    let qparams = {
        melvin_state:  JSON.stringify(melvin_state),
        splitby_state: JSON.stringify(splitby_state)
    };
    var signedRequest = await signUrl(path, qparams);
    try {
        const result = await process_repeat_requests(handlerInput, splitby_url, signedRequest.headers);
        return result;
    } catch(err) {
        if(err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
            const nunjucks_context = {
                melvin_state: melvin_state, splitby_state: splitby_state 
            };
            const speech_ssml = build_ssml_response_from_nunjucks("error/splitby_data_is_zero.njk", nunjucks_context);
            throw melvin_error(
                `[get_snv_ind_splitby_tcga_stats] Melvin Explorer error: ${JSON.stringify(err)}`,
                err.type,
                speech_ssml
            );
        }
        throw err;
    }
};

const get_snv_cna_splitby_tcga_stats = async function (handlerInput, melvin_state, splitby_state) {
    const splitby_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/splitby/tcga/SNVsCNA_stats`);
    splitby_url.searchParams.set("melvin_state", JSON.stringify(melvin_state));
    splitby_url.searchParams.set("splitby_state", JSON.stringify(splitby_state));
    const path = "/analysis/splitby/tcga/SNVsCNA_stats";
    let qparams = {
        melvin_state:  JSON.stringify(melvin_state),
        splitby_state: JSON.stringify(splitby_state)
    };
    var signedRequest = await signUrl(path, qparams);
    try {
        const result = await process_repeat_requests(handlerInput, splitby_url, signedRequest.headers);
        return result;
    } catch(err) {
        if(err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
            const nunjucks_context = {
                melvin_state: melvin_state, splitby_state: splitby_state 
            };
            const speech_ssml = build_ssml_response_from_nunjucks("error/splitby_data_is_zero.njk", nunjucks_context);
            throw melvin_error(
                `[get_snv_cna_splitby_tcga_stats] Melvin Explorer error: ${JSON.stringify(err)}`,
                err.type,
                speech_ssml
            );
        }
        throw err;
    }
};

const get_snv_gain_splitby_tcga_stats = async function (handlerInput, melvin_state, splitby_state) {
    const splitby_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/splitby/tcga/SNVsGAIN_stats`);
    splitby_url.searchParams.set("melvin_state", JSON.stringify(melvin_state));
    splitby_url.searchParams.set("splitby_state", JSON.stringify(splitby_state));
    const path = "/analysis/splitby/tcga/SNVsGAIN_stats";
    let qparams = {
        melvin_state:  JSON.stringify(melvin_state),
        splitby_state: JSON.stringify(splitby_state)
    };
    var signedRequest = await signUrl(path, qparams);
    try {
        const result = await process_repeat_requests(handlerInput, splitby_url, signedRequest.headers);
        return result;
    } catch(err) {
        if(err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
            const nunjucks_context = {
                melvin_state: melvin_state, splitby_state: splitby_state 
            };
            const speech_ssml = build_ssml_response_from_nunjucks("error/splitby_data_is_zero.njk", nunjucks_context);
            throw melvin_error(
                `[get_snv_gain_splitby_tcga_stats] Melvin Explorer error: ${JSON.stringify(err)}`,
                err.type,
                speech_ssml
            );
        }
        throw err;
    }
};

const get_snv_loss_splitby_tcga_stats = async function (handlerInput, melvin_state, splitby_state) {
    const splitby_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/splitby/tcga/SNVsLOSS_stats`);
    splitby_url.searchParams.set("melvin_state", JSON.stringify(melvin_state));
    splitby_url.searchParams.set("splitby_state", JSON.stringify(splitby_state));
    const path = "/analysis/splitby/tcga/SNVsLOSS_stats";
    let qparams = {
        melvin_state:  JSON.stringify(melvin_state),
        splitby_state: JSON.stringify(splitby_state)
    };
    var signedRequest = await signUrl(path, qparams);
    try {
        const result = await process_repeat_requests(handlerInput, splitby_url, signedRequest.headers);
        return result;
    } catch(err) {
        if(err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
            const nunjucks_context = {
                melvin_state: melvin_state, splitby_state: splitby_state 
            };
            const speech_ssml = build_ssml_response_from_nunjucks("error/splitby_data_is_zero.njk", nunjucks_context);
            throw melvin_error(
                `[get_snv_loss_splitby_tcga_stats] Melvin Explorer error: ${JSON.stringify(err)}`,
                err.type,
                speech_ssml
            );
        }
        throw err;
    }
};

const get_mut_splitby_tcga_stats = async function (handlerInput, melvin_state, splitby_state) {
    const splitby_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/splitby/tcga/MUT_stats`);
    splitby_url.searchParams.set("melvin_state", JSON.stringify(melvin_state));
    splitby_url.searchParams.set("splitby_state", JSON.stringify(splitby_state));
    const path = "/analysis/splitby/tcga/MUT_stats";
    let qparams = {
        melvin_state:  JSON.stringify(melvin_state),
        splitby_state: JSON.stringify(splitby_state)
    };
    var signedRequest = await signUrl(path, qparams);
    try {
        const result = await process_repeat_requests(handlerInput, splitby_url, signedRequest.headers);
        return result;
    } catch(err) {
        if(err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
            const nunjucks_context = {
                melvin_state: melvin_state, splitby_state: splitby_state 
            };
            const speech_ssml = build_ssml_response_from_nunjucks("error/splitby_data_is_zero.njk", nunjucks_context);
            throw melvin_error(
                `[get_mut_splitby_tcga_stats] Melvin Explorer error: ${JSON.stringify(err)}`,
                err.type,
                speech_ssml
            );
        }
        throw err;
    }
};

const get_exp_splitby_tcga_stats = async function (handlerInput, melvin_state, splitby_state) {
    const splitby_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/splitby/tcga/EXP_stats`);
    splitby_url.searchParams.set("melvin_state", JSON.stringify(melvin_state));
    splitby_url.searchParams.set("splitby_state", JSON.stringify(splitby_state));
    const path = "/analysis/splitby/tcga/EXP_stats";
    let qparams = {
        melvin_state:  JSON.stringify(melvin_state),
        splitby_state: JSON.stringify(splitby_state)
    };
    var signedRequest = await signUrl(path, qparams);
    try {
        const result = await process_repeat_requests(handlerInput, splitby_url, signedRequest.headers);
        return result;
    } catch(err) {
        if(err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
            const nunjucks_context = {
                melvin_state: melvin_state, splitby_state: splitby_state 
            };
            const speech_ssml = build_ssml_response_from_nunjucks("error/splitby_data_is_zero.njk", nunjucks_context);
            throw melvin_error(
                `[get_exp_splitby_tcga_stats] Melvin Explorer error: ${JSON.stringify(err)}`,
                err.type,
                speech_ssml
            );
        }
        throw err;
    }
};

const get_sv_clinvar_stats = async function (handlerInput, params) {
    const sv_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/structural_variants/clinvar/stats`);
    add_query_params(sv_url, params);
    const result = await process_repeat_requests(handlerInput, sv_url);
    return result;
};

const get_mut_cna_compare_tcga_stats = async function (handlerInput, params, compare_state) {
    const compare_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/comparison/tcga/MUTvCNA_stats`);
    const path = "/analysis/comparison/tcga/MUTvCNA_stats";
    var qparams = add_query_params(compare_url, params);
    try {
        var signedRequest = await signUrl(path, qparams);
        const result = await process_repeat_requests(handlerInput, compare_url, signedRequest.headers);
        return result;
    } catch(err) {
        if(err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
            const nunjucks_context = {
                melvin_state: params, compare_state: compare_state 
            };
            const speech_ssml = build_ssml_response_from_nunjucks("error/compare_data_is_zero.njk", nunjucks_context);
            throw melvin_error(
                `[get_mut_cna_compare_tcga_stats] Melvin Explorer error: ${JSON.stringify(err)}`,
                err.type,
                speech_ssml
            );
        }
        throw err;
    }
};

const get_mut_gain_compare_tcga_stats = async function (handlerInput, params, compare_state) {
    const compare_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/comparison/tcga/MUTvGAIN_stats`);
    const path = "/analysis/comparison/tcga/MUTvGAIN_stats";
    var qparams = add_query_params(compare_url, params);
    try {
        var signedRequest = await signUrl(path, qparams);
        const result = await process_repeat_requests(handlerInput, compare_url, signedRequest.headers);
        return result;
    } catch(err) {
        if(err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
            const nunjucks_context = {
                melvin_state: params, compare_state: compare_state 
            };
            const speech_ssml = build_ssml_response_from_nunjucks("error/compare_data_is_zero.njk", nunjucks_context);
            throw melvin_error(
                `[get_mut_gain_compare_tcga_stats] Melvin Explorer error: ${JSON.stringify(err)}`,
                err.type,
                speech_ssml
            );
        }
        throw err;
    }
};

const get_mut_loss_compare_tcga_stats = async function (handlerInput, params, compare_state) {
    const compare_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/comparison/tcga/MUTvLOSS_stats`);
    const path = "/analysis/comparison/tcga/MUTvLOSS_stats";
    var qparams = add_query_params(compare_url, params);
    add_query_params(compare_url, params);
    try {
        var signedRequest = await signUrl(path, qparams);
        const result = await process_repeat_requests(handlerInput, compare_url, signedRequest.headers);
        return result;
    } catch(err) {
        if(err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
            const nunjucks_context = {
                melvin_state: params, compare_state: compare_state 
            };
            const speech_ssml = build_ssml_response_from_nunjucks("error/compare_data_is_zero.njk", nunjucks_context);
            throw melvin_error(
                `[get_mut_loss_compare_tcga_stats] Melvin Explorer error: ${JSON.stringify(err)}`,
                err.type,
                speech_ssml
            );
        }
        throw err;
    }
};

const get_gain_loss_compare_tcga_stats = async function (handlerInput, params, compare_state) {
    const compare_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/comparison/tcga/GAINvLOSS_stats`);
    const path = "/analysis/comparison/tcga/GAINvLOSS_stats";
    var qparams = add_query_params(compare_url, params);
    try {
        var signedRequest = await signUrl(path, qparams);
        const result = await process_repeat_requests(handlerInput, compare_url, signedRequest.headers);
        return result;
    } catch(err) {
        if(err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
            const nunjucks_context = {
                melvin_state: params, compare_state: compare_state 
            };
            const speech_ssml = build_ssml_response_from_nunjucks("error/compare_data_is_zero.njk", nunjucks_context);
            throw melvin_error(
                `[get_gain_loss_compare_tcga_stats] Melvin Explorer error: ${JSON.stringify(err)}`,
                err.type,
                speech_ssml
            );
        }
        throw err;
    }
};

const get_ind_cna_compare_tcga_stats = async function (handlerInput, params, compare_state) {
    const compare_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/comparison/tcga/INDvCNA_stats`);
    const path = "/analysis/comparison/tcga/INDvCNA_stats";
    var qparams = add_query_params(compare_url, params);
    try {
        var signedRequest = await signUrl(path, qparams);
        const result = await process_repeat_requests(handlerInput, compare_url, signedRequest.headers);
        return result;
    } catch(err) {
        if(err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
            const nunjucks_context = {
                melvin_state: params, compare_state: compare_state 
            };
            const speech_ssml = build_ssml_response_from_nunjucks("error/compare_data_is_zero.njk", nunjucks_context);
            throw melvin_error(
                `[get_ind_cna_compare_tcga_stats] Melvin Explorer error: ${JSON.stringify(err)}`,
                err.type,
                speech_ssml
            );
        }
        throw err;
    }
};

const get_snv_cna_compare_tcga_stats = async function (handlerInput, params, compare_state) {
    const compare_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/comparison/tcga/SNVvCNA_stats`);
    const path = "/analysis/comparison/tcga/SNVvCNA_stats";
    var qparams = add_query_params(compare_url, params);
    try {
        var signedRequest = await signUrl(path, qparams);
        const result = await process_repeat_requests(handlerInput, compare_url, signedRequest.headers);
        return result;
    } catch(err) {
        if(err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
            const nunjucks_context = {
                melvin_state: params, compare_state: compare_state 
            };
            const speech_ssml = build_ssml_response_from_nunjucks("error/compare_data_is_zero.njk", nunjucks_context);
            throw melvin_error(
                `[get_snv_cna_compare_tcga_stats] Melvin Explorer error: ${JSON.stringify(err)}`,
                err.type,
                speech_ssml
            );
        }
        throw err;
    }
};

const get_snv_ind_compare_tcga_stats = async function (handlerInput, params, compare_state) {
    const compare_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/comparison/tcga/SNVvIND_stats`);
    const path = "/analysis/comparison/tcga/SNVvIND_stats";
    var qparams = add_query_params(compare_url, params);
    add_query_params(compare_url, params);
    try {
        var signedRequest = await signUrl(path, qparams);
        const result = await process_repeat_requests(handlerInput, compare_url, signedRequest.headers);
        return result;
    } catch(err) {
        if(err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
            const nunjucks_context = {
                melvin_state: params, compare_state: compare_state 
            };
            const speech_ssml = build_ssml_response_from_nunjucks("error/compare_data_is_zero.njk", nunjucks_context);
            throw melvin_error(
                `[get_snv_ind_compare_tcga_stats] Melvin Explorer error: ${JSON.stringify(err)}`,
                err.type,
                speech_ssml
            );
        }
        throw err;
    }
};

const get_ind_gain_compare_tcga_stats = async function (handlerInput, params, compare_state) {
    const compare_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/comparison/tcga/INDvGAIN_stats`);
    const path = "/analysis/comparison/tcga/INDvGAIN_stats";
    var qparams = add_query_params(compare_url, params);
    try {
        var signedRequest = await signUrl(path, qparams);
        const result = await process_repeat_requests(handlerInput, compare_url, signedRequest.headers);
        return result;
    } catch(err) {
        if(err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
            const nunjucks_context = {
                melvin_state: params, compare_state: compare_state 
            };
            const speech_ssml = build_ssml_response_from_nunjucks("error/compare_data_is_zero.njk", nunjucks_context);
            throw melvin_error(
                `[get_ind_gain_compare_tcga_stats] Melvin Explorer error: ${JSON.stringify(err)}`,
                err.type,
                speech_ssml
            );
        }
        throw err;
    }
};

const get_ind_loss_compare_tcga_stats = async function (handlerInput, params, compare_state) {
    const compare_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/comparison/tcga/INDvLOSS_stats`);
    const path = "/analysis/comparison/tcga/INDvLOSS_stats";
    var qparams = add_query_params(compare_url, params);
    try {
        var signedRequest = await signUrl(path, qparams);
        const result = await process_repeat_requests(handlerInput, compare_url, signedRequest.headers);
        return result;
    } catch(err) {
        if(err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
            const nunjucks_context = {
                melvin_state: params, compare_state: compare_state 
            };
            const speech_ssml = build_ssml_response_from_nunjucks("error/compare_data_is_zero.njk", nunjucks_context);
            throw melvin_error(
                `[get_ind_loss_compare_tcga_stats] Melvin Explorer error: ${JSON.stringify(err)}`,
                err.type,
                speech_ssml
            );
        }
        throw err;
    }
};

const get_snv_gain_compare_tcga_stats = async function (handlerInput, params, compare_state) {
    const compare_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/comparison/tcga/SNVvGAIN_stats`);
    const path = "/analysis/comparison/tcga/SNVvGAIN_stats";
    var qparams = add_query_params(compare_url, params);
    try {
        var signedRequest = await signUrl(path, qparams);
        const result = await process_repeat_requests(handlerInput, compare_url, signedRequest.headers);
        return result;
    } catch(err) {
        if(err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
            const nunjucks_context = {
                melvin_state: params, compare_state: compare_state 
            };
            const speech_ssml = build_ssml_response_from_nunjucks("error/compare_data_is_zero.njk", nunjucks_context);
            throw melvin_error(
                `[get_snv_gain_compare_tcga_stats] Melvin Explorer error: ${JSON.stringify(err)}`,
                err.type,
                speech_ssml
            );
        }
        throw err;
    }
};

const get_snv_loss_compare_tcga_stats = async function (handlerInput, params, compare_state) {
    const compare_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/comparison/tcga/SNVvLOSS_stats`);
    const path = "/analysis/comparison/tcga/SNVvLOSS_stats";
    var qparams = add_query_params(compare_url, params);
    try {
        var signedRequest = await signUrl(path, qparams);
        const result = await process_repeat_requests(handlerInput, compare_url, signedRequest.headers);
        return result;
    } catch(err) {
        if(err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
            const nunjucks_context = {
                melvin_state: params, compare_state: compare_state 
            };
            const speech_ssml = build_ssml_response_from_nunjucks("error/compare_data_is_zero.njk", nunjucks_context);
            throw melvin_error(
                `[get_mut_gain_compare_tcga_stats] Melvin Explorer error: ${JSON.stringify(err)}`,
                err.type,
                speech_ssml
            );
        }
        throw err;
    }
};

module.exports = {
    get_mutations_tcga_top_genes,
    get_mutations_tcga_stats,
    get_mutations_tcga_domain_stats,
    get_indels_tcga_stats,
    get_indels_tcga_domain_stats,
    get_snvs_tcga_stats,
    get_snvs_tcga_domain_stats,
    get_cna_tcga_stats,
    get_gain_tcga_stats,
    get_loss_tcga_stats,
    get_gene_expression_tcga_stats,
    get_gain_gain_splitby_tcga_stats,
    get_gain_loss_splitby_tcga_stats,
    get_loss_loss_splitby_tcga_stats,
    get_cna_cna_splitby_tcga_stats,
    get_cna_gain_splitby_tcga_stats,
    get_cna_loss_splitby_tcga_stats,
    get_ind_ind_splitby_tcga_stats,
    get_ind_cna_splitby_tcga_stats,
    get_ind_gain_splitby_tcga_stats,
    get_ind_loss_splitby_tcga_stats,
    get_snv_snv_splitby_tcga_stats,
    get_snv_ind_splitby_tcga_stats,
    get_snv_cna_splitby_tcga_stats,
    get_snv_gain_splitby_tcga_stats,
    get_snv_loss_splitby_tcga_stats,
    get_mut_splitby_tcga_stats,
    get_exp_splitby_tcga_stats,
    get_mutations_clinvar_stats,
    get_cna_clinvar_stats,
    get_gene_expression_clinvar_stats,
    get_sv_clinvar_stats,
    get_clinical_trials,    
    get_gene_by_name,
    get_gene_target,
    get_mut_cna_compare_tcga_stats,
    get_mut_gain_compare_tcga_stats,
    get_mut_loss_compare_tcga_stats,
    get_gain_loss_compare_tcga_stats,
    get_ind_cna_compare_tcga_stats,
    get_snv_cna_compare_tcga_stats,
    get_snv_ind_compare_tcga_stats,
    get_ind_gain_compare_tcga_stats,
    get_ind_loss_compare_tcga_stats,
    get_snv_gain_compare_tcga_stats,
    get_snv_loss_compare_tcga_stats
};