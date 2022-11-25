const _ = require("lodash");
const AWS = require("aws-sdk");
const { sign_request } = require("../utils/sigv4_utils");
const fetch = require("@adobe/node-fetch-retry");
const allSettled = require("promise.allsettled");
const AbortController = require("abort-controller");
const https = require("https");
const { performance } = require("perf_hooks");

const {
    MelvinIntentErrors,
    melvin_error,
    DEFAULT_AE_ACCESS_ERROR_RESPONSE,
    DEFAULT_AE_CONNECT_ERROR_RESPONSE,
    AE_PR_SPEECH,
    AE_PR_SPEECH_RETRY,
    MELVIN_EXPLORER_ENDPOINT,
    MELVIN_EXPLORER_REGION,
    MelvinExplorerErrors,
    delay_ms
} = require("../common.js");
const {
    add_query_params, add_query_list_params, call_directive_service, build_ssml_response_from_nunjucks
} = require("../utils/response_builder_utils.js");
const { build_melvin_voice_response } = require("../utils/response_builder_utils.js");

const agent = new https.Agent({ maxSockets: 100 });
AWS.config.update({ httpOptions: { agent: agent }});

const AE_DEFAULT_MAX_DURATION = 10000;
const AE_DEFAULT_SOCKET_TIMEOUT = 6000;
const AE_DEFAULT_INITIAL_DELAY = 200;
const PR_DELAY_FIRST = 3000;
const PR_DELAY_SECOND = 4000;

const send_request_async = function (url, headers, handlerInput) {
    console.info(`[melvin_explorer_client] AE url: ${url}`);
    const t1 = performance.now();
    return fetch(url, {
        headers:      headers,
        retryOptions: {
            retryMaxDuration:  AE_DEFAULT_MAX_DURATION,
            retryInitialDelay: AE_DEFAULT_INITIAL_DELAY,
            retryBackoff:      1.0,
            socketTimeout:     AE_DEFAULT_SOCKET_TIMEOUT,
            onRetry:           async (error) => {
                console.error(`[melvin_explorer_client] AE request failed: ${JSON.stringify(error)}`);
                const speech_ssml = build_melvin_voice_response(AE_PR_SPEECH_RETRY);
                await call_directive_service(handlerInput, speech_ssml)
                    .then(() => {
                        console.info("[melvin_explorer_client] progressive response on retry sent");
                    })
                    .catch(error => {
                        console.error("[melvin_explorer_client] progressive response on retry failed", error);
                    });
            }
        }
    }).then(async (response) => {
        const t2 = performance.now();
        console.info(`[melvin_explorer_client] AE request took ${(t2 - t1)} ms | response status: ${response.status}`);
        if (response.ok) {
            return response.json();
        } else {
            throw await response.text();
        }
    }).catch((err) => {
        throw melvin_error(
            `[melvin_explorer_client] Melvin Explorer error: ${JSON.stringify(err)}`,
            MelvinIntentErrors.INVALID_API_RESPONSE,
            DEFAULT_AE_CONNECT_ERROR_RESPONSE
        );
    });
};

const process_repeat_requests = async function (handlerInput, url, headers) {
    const controller_pr = new AbortController();
    const reqAttributes = handlerInput.attributesManager.getRequestAttributes();
    const oov_pr_sent = _.has(reqAttributes, "OOV_PR_SENT");
    const ae_req_async = async () => {
        const response = await send_request_async(url, headers, handlerInput);
        controller_pr.abort();
        if (_.has(response, "data")) {
            return response;
        } else if (_.has(response, "error")) {
            if (response["error"] === MelvinExplorerErrors.DATA_IS_ZERO) {
                let description = "There is no data in the database.";
                if (response.description != null) {
                    description = response["description"];
                    if (!description.trim().endsWith(".")) description += ".";
                }
                throw melvin_error(`[melvin_explorer_client] Data is zero error: ${JSON.stringify(response)}`,
                    MelvinExplorerErrors.DATA_IS_ZERO,
                    description);
            } else {
                console.error(`[melvin_explorer_client] AE data error: ${JSON.stringify(response)}`);
                throw melvin_error(
                    `[melvin_explorer_client] AE response contains error | ${JSON.stringify(response)}`,
                    MelvinIntentErrors.INVALID_API_RESPONSE,
                    DEFAULT_AE_ACCESS_ERROR_RESPONSE
                );
            }
        } else {
            console.error(`[melvin_explorer_client] AE general error: ${JSON.stringify(response)}`);
            throw melvin_error(
                `[melvin_explorer_client] AE response does not contain data | ${JSON.stringify(response)}`,
                MelvinIntentErrors.INVALID_API_RESPONSE,
                DEFAULT_AE_ACCESS_ERROR_RESPONSE
            );
        }
    };


    // Alexa progressive response to indicate that analysis engine is going to take little longer
    const send_pr_req_async = async (controller) => {
        const adaptive_delay = oov_pr_sent ? PR_DELAY_SECOND : PR_DELAY_FIRST;
        console.info(`[melvin_explorer_client] adaptive_delay: ${adaptive_delay}`);
        await delay_ms(adaptive_delay, controller);
        let res = null;
        if (!controller.signal.aborted) {
            if (!process.env.IS_LOCAL) {
                const speech_ssml = build_melvin_voice_response(AE_PR_SPEECH);
                res = await call_directive_service(handlerInput, speech_ssml)
                    .then(() => {
                        console.info("[melvin_explorer_client] progressive response sent");
                    })
                    .catch(error => {
                        console.error("[melvin_explorer_client] progressive response failed", error);
                    });
            } else {
                console.info("[melvin_explorer_client] skipping progressive response in local environment");
            }
        }
        return res;
    };

    const t1 = performance.now();
    const results = await allSettled([send_pr_req_async(controller_pr), ae_req_async()]);
    const t2 = performance.now();
    console.info(`[melvin_explorer_client] AE process took ${t2 - t1} ms, results: ${JSON.stringify(results)}`);
    const ae_result = results[1];
    if (ae_result["status"] === "fulfilled") {
        return ae_result["value"];
    } else {
        throw melvin_error(
            `[melvin_explorer_client] Melvin Explorer error: ${JSON.stringify(ae_result)}`,
            _.get(ae_result, "reason.type", MelvinIntentErrors.INVALID_API_RESPONSE),
            _.get(ae_result, "reason.speech", DEFAULT_AE_ACCESS_ERROR_RESPONSE)
        );
    }
};

const get_mutations_tcga_top_genes = async function (handlerInput, params) {
    const mutations_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/tcga/top_genes`);
    add_query_params(mutations_url, params);
    const signed_req = await sign_request(mutations_url, MELVIN_EXPLORER_REGION, handlerInput);
    return await process_repeat_requests(handlerInput, mutations_url, signed_req.headers);
};

const get_mutations_tcga_stats = async function (handlerInput, params) {
    const mutations_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/tcga/MUT_stats`);
    add_query_params(mutations_url, params);
    const signed_req = await sign_request(mutations_url, MELVIN_EXPLORER_REGION, handlerInput);
    try {
        return await process_repeat_requests(handlerInput, mutations_url, signed_req.headers);
    } catch (err) {
        if (err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
            const nunjucks_context = { melvin_state: params };
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
    add_query_params(mutations_url, params);
    mutations_url.searchParams.set("style", "domain");
    const signed_req = await sign_request(mutations_url, MELVIN_EXPLORER_REGION, handlerInput);
    try {
        return await process_repeat_requests(handlerInput, mutations_url, signed_req.headers);
    } catch (err) {
        if (err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
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
    add_query_params(indels_url, params);
    const signed_req = await sign_request(indels_url, MELVIN_EXPLORER_REGION, handlerInput);
    try {
        return await process_repeat_requests(handlerInput, indels_url, signed_req.headers);
    } catch (err) {
        if (err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
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
    add_query_params(indels_url, params);
    indels_url.searchParams.set("style", "domain");
    const signed_req = await sign_request(indels_url, MELVIN_EXPLORER_REGION, handlerInput);
    try {
        return await process_repeat_requests(handlerInput, indels_url, signed_req.headers);
    } catch (err) {
        if (err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
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
    add_query_params(snvs_url, params);
    const signed_req = await sign_request(snvs_url, MELVIN_EXPLORER_REGION, handlerInput);
    try {
        return await process_repeat_requests(handlerInput, snvs_url, signed_req.headers);
    } catch (err) {
        if (err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
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
    add_query_params(snvs_url, params);
    snvs_url.searchParams.set("style", "domain");
    const signed_req = await sign_request(snvs_url, MELVIN_EXPLORER_REGION, handlerInput);
    try {
        return await process_repeat_requests(handlerInput, snvs_url, signed_req.headers);
    } catch (err) {
        if (err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
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
    const signed_req = await sign_request(clinical_trials_url, MELVIN_EXPLORER_REGION, handlerInput);
    return await process_repeat_requests(handlerInput, clinical_trials_url, signed_req.headers);
};

const get_cna_clinvar_stats = async function (handlerInput, params) {
    const cna_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/cna/clinvar/stats`);
    add_query_params(cna_url, params);
    const signed_req = await sign_request(cna_url, MELVIN_EXPLORER_REGION, handlerInput);
    return await process_repeat_requests(handlerInput, cna_url, signed_req.headers);
};

const get_cna_tcga_stats = async function (handlerInput, params) {
    const cna_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/cna/tcga/cna_stats`);
    add_query_params(cna_url, params);
    const signed_req = await sign_request(cna_url, MELVIN_EXPLORER_REGION, handlerInput);
    try {
        return await process_repeat_requests(handlerInput, cna_url, signed_req.headers);
    } catch (err) {
        if (err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
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
    add_query_params(gain_stats_url, params);
    const signed_req = await sign_request(gain_stats_url, MELVIN_EXPLORER_REGION, handlerInput);
    try {
        return await process_repeat_requests(handlerInput, gain_stats_url, signed_req.headers);
    } catch (err) {
        if (err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
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
    add_query_params(loss_stats_url, params);
    const signed_req = await sign_request(loss_stats_url, MELVIN_EXPLORER_REGION, handlerInput);
    try {
        return await process_repeat_requests(handlerInput, loss_stats_url, signed_req.headers);
    } catch (err) {
        if (err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
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
    const signed_req = await sign_request(gene_url, MELVIN_EXPLORER_REGION, handlerInput);
    return await process_repeat_requests(handlerInput, gene_url, signed_req.headers);
};

const get_gene_target = async function (handlerInput, params) {
    const gene_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/gene_targets/${params.gene_name}`);
    const signed_req = await sign_request(gene_url, MELVIN_EXPLORER_REGION, handlerInput);
    try {
        return await process_repeat_requests(handlerInput, gene_url, signed_req.headers);
    } catch (err) {
        if (err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
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
    const signed_req = await sign_request(gene_expression_url, MELVIN_EXPLORER_REGION, handlerInput);
    return await process_repeat_requests(handlerInput, gene_expression_url, signed_req.headers);
};

const get_gene_expression_tcga_stats = async function (handlerInput, params) {
    const gene_expression_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/gene_expression/tcga/stats`);
    add_query_params(gene_expression_url, params);
    const signed_req = await sign_request(gene_expression_url, MELVIN_EXPLORER_REGION, handlerInput);
    try {
        return await process_repeat_requests(handlerInput, gene_expression_url, signed_req.headers);
    } catch (err) {
        if (err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
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
    const signed_req = await sign_request(splitby_url, MELVIN_EXPLORER_REGION, handlerInput);
    try {
        return await process_repeat_requests(handlerInput, splitby_url, signed_req.headers);
    } catch (err) {
        if (err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
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
    const signed_req = await sign_request(splitby_url, MELVIN_EXPLORER_REGION, handlerInput);
    try {
        return await process_repeat_requests(handlerInput, splitby_url, signed_req.headers);
    } catch (err) {
        if (err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
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
    const signed_req = await sign_request(splitby_url, MELVIN_EXPLORER_REGION, handlerInput);
    try {
        return await process_repeat_requests(handlerInput, splitby_url, signed_req.headers);
    } catch (err) {
        if (err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
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

    const signed_req = await sign_request(splitby_url, MELVIN_EXPLORER_REGION, handlerInput);
    try {
        return await process_repeat_requests(handlerInput, splitby_url, signed_req.headers);
    } catch (err) {
        if (err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
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
    const signed_req = await sign_request(splitby_url, MELVIN_EXPLORER_REGION, handlerInput);
    try {
        return await process_repeat_requests(handlerInput, splitby_url, signed_req.headers);
    } catch (err) {
        if (err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
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
    const signed_req = await sign_request(splitby_url, MELVIN_EXPLORER_REGION, handlerInput);
    try {
        return await process_repeat_requests(handlerInput, splitby_url, signed_req.headers);
    } catch (err) {
        if (err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
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
    const signed_req = await sign_request(splitby_url, MELVIN_EXPLORER_REGION, handlerInput);
    try {
        return await process_repeat_requests(handlerInput, splitby_url, signed_req.headers);
    } catch (err) {
        if (err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
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
    const signed_req = await sign_request(splitby_url, MELVIN_EXPLORER_REGION, handlerInput);
    try {
        return await process_repeat_requests(handlerInput, splitby_url, signed_req.headers);
    } catch (err) {
        if (err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
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
    const signed_req = await sign_request(splitby_url, MELVIN_EXPLORER_REGION, handlerInput);
    try {
        return await process_repeat_requests(handlerInput, splitby_url, signed_req.headers);
    } catch (err) {
        if (err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
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
    const signed_req = await sign_request(splitby_url, MELVIN_EXPLORER_REGION, handlerInput);
    try {
        return await process_repeat_requests(handlerInput, splitby_url, signed_req.headers);
    } catch (err) {
        if (err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
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
    const signed_req = await sign_request(splitby_url, MELVIN_EXPLORER_REGION, handlerInput);
    try {
        return await process_repeat_requests(handlerInput, splitby_url, signed_req.headers);
    } catch (err) {
        if (err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
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
    const signed_req = await sign_request(splitby_url, MELVIN_EXPLORER_REGION, handlerInput);
    try {
        return await process_repeat_requests(handlerInput, splitby_url, signed_req.headers);
    } catch (err) {
        if (err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
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
    const signed_req = await sign_request(splitby_url, MELVIN_EXPLORER_REGION, handlerInput);
    try {
        return await process_repeat_requests(handlerInput, splitby_url, signed_req.headers);
    } catch (err) {
        if (err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
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
    const signed_req = await sign_request(splitby_url, MELVIN_EXPLORER_REGION, handlerInput);
    try {
        return await process_repeat_requests(handlerInput, splitby_url, signed_req.headers);
    } catch (err) {
        if (err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
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
    const signed_req = await sign_request(splitby_url, MELVIN_EXPLORER_REGION, handlerInput);
    try {
        return await process_repeat_requests(handlerInput, splitby_url, signed_req.headers);
    } catch (err) {
        if (err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
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
    const signed_req = await sign_request(splitby_url, MELVIN_EXPLORER_REGION, handlerInput);
    try {
        return await process_repeat_requests(handlerInput, splitby_url, signed_req.headers);
    } catch (err) {
        if (err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
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
    const signed_req = await sign_request(splitby_url, MELVIN_EXPLORER_REGION, handlerInput);
    try {
        return await process_repeat_requests(handlerInput, splitby_url, signed_req.headers);
    } catch (err) {
        if (err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
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
    const signed_req = await sign_request(sv_url, MELVIN_EXPLORER_REGION, handlerInput);
    return await process_repeat_requests(handlerInput, sv_url, signed_req.headers);
};

const get_mut_cna_compare_tcga_stats = async function (handlerInput, params, compare_state) {
    const compare_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/comparison/tcga/MUTvCNA_stats`);
    add_query_params(compare_url, params);
    try {
        const signed_req = await sign_request(compare_url, MELVIN_EXPLORER_REGION, handlerInput);
        return await process_repeat_requests(handlerInput, compare_url, signed_req.headers);
    } catch (err) {
        if (err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
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
    add_query_params(compare_url, params);
    try {
        const signed_req = await sign_request(compare_url, MELVIN_EXPLORER_REGION, handlerInput);
        return await process_repeat_requests(handlerInput, compare_url, signed_req.headers);
    } catch (err) {
        if (err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
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
    add_query_params(compare_url, params);
    try {
        const signed_req = await sign_request(compare_url, MELVIN_EXPLORER_REGION, handlerInput);
        return await process_repeat_requests(handlerInput, compare_url, signed_req.headers);
    } catch (err) {
        if (err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
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
    add_query_params(compare_url, params);
    try {
        const signed_req = await sign_request(compare_url, MELVIN_EXPLORER_REGION, handlerInput);
        return await process_repeat_requests(handlerInput, compare_url, signed_req.headers);
    } catch (err) {
        if (err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
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
    add_query_params(compare_url, params);
    try {
        const signed_req = await sign_request(compare_url, MELVIN_EXPLORER_REGION, handlerInput);
        return await process_repeat_requests(handlerInput, compare_url, signed_req.headers);
    } catch (err) {
        if (err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
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
    add_query_params(compare_url, params);
    try {
        const signed_req = await sign_request(compare_url, MELVIN_EXPLORER_REGION, handlerInput);
        return await process_repeat_requests(handlerInput, compare_url, signed_req.headers);
    } catch (err) {
        if (err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
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
    add_query_params(compare_url, params);
    try {
        const signed_req = await sign_request(compare_url, MELVIN_EXPLORER_REGION, handlerInput);
        return await process_repeat_requests(handlerInput, compare_url, signed_req.headers);
    } catch (err) {
        if (err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
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
    add_query_params(compare_url, params);
    try {
        const signed_req = await sign_request(compare_url, MELVIN_EXPLORER_REGION, handlerInput);
        return await process_repeat_requests(handlerInput, compare_url, signed_req.headers);
    } catch (err) {
        if (err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
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
    add_query_params(compare_url, params);
    try {
        const signed_req = await sign_request(compare_url, MELVIN_EXPLORER_REGION, handlerInput);
        return await process_repeat_requests(handlerInput, compare_url, signed_req.headers);
    } catch (err) {
        if (err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
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
    add_query_params(compare_url, params);
    try {
        const signed_req = await sign_request(compare_url, MELVIN_EXPLORER_REGION, handlerInput);
        return await process_repeat_requests(handlerInput, compare_url, signed_req.headers);
    } catch (err) {
        if (err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
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
    add_query_params(compare_url, params);
    try {
        const signed_req = await sign_request(compare_url, MELVIN_EXPLORER_REGION, handlerInput);
        return await process_repeat_requests(handlerInput, compare_url, signed_req.headers);
    } catch (err) {
        if (err.type == MelvinExplorerErrors.DATA_IS_ZERO) {
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