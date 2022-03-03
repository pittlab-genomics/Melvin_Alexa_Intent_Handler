const AWS = require("aws-sdk");
const fetch = require("node-fetch");
const allSettled = require("promise.allsettled");
const AbortController = require("abort-controller");
const {
    sign_request, assume_role, build_presigned_url
} = require("../utils/sigv4_utils");
const https = require("https");
const moment = require("moment");

const sessions_doc = require("../dao/sessions.js");
const {
    MelvinAttributes,
    SUPPORTED_SPLITBY_DTYPES,
    MELVIN_EXPLORER_ENDPOINT,
    OOV_MAPPER_ENDPOINT,
    MELVIN_API_INVOKE_ROLE,
    OOV_MAPPER_REGION,
    MELVIN_EXPLORER_REGION,
    WARMUP_SERVICE_ENABLED
} = require("../common.js");

const agent = new https.Agent({ maxSockets: 100 });
AWS.config.update({ httpOptions: { agent: agent }});

const STATS_EP_TIMEOUT = 5000;
const PLOT_EP_TIMEOUT = 5000;
const MAPPER_EP_TIMEOUT = 2000;
const WARMUP_SESSION_TIMEOUT = 900; // disable warmup rule if there is no new user sessions after `timeout` seconds

/*
    make sure to include at least N number of entries for each unique path 
    since Lambda functions will be provisioned for the speicified `reservedConcurrency` limit
*/
const PARALLEL_REQUEST_COUNT = 3;

const stats_ep_path_dict = {
    "mutations": [
        "/analysis/mutations/tcga/MUT_stats?gene=TP53",
        "/analysis/mutations/tcga/MUT_stats?study=BRCA",
        "/analysis/mutations/tcga/MUT_stats?gene=TP53&study=BRCA"
    ],
    "indels": [
        "/analysis/mutations/tcga/IND_stats?gene=TP53&study=BRCA",
        "/analysis/mutations/tcga/IND_stats?gene=CDH1",
        "/analysis/mutations/tcga/IND_stats?study=BRCA"
    ],
    "snv": [
        "/analysis/mutations/tcga/SNV_stats?gene=TP53&study=BRCA",
        "/analysis/mutations/tcga/SNV_stats?gene=CDH1",
        "/analysis/mutations/tcga/SNV_stats?study=BRCA"
    ],
    "cna": [
        "/analysis/cna/tcga/cna_stats?gene=cdh17&study=BRCA",
        "/analysis/cna/tcga/cna_stats?gene=TP53",
        "/analysis/cna/tcga/cna_stats?study=BRCA"
    ],
    "gain": [
        "/analysis/cna/tcga/gain_stats?gene=cdh17&study=BRCA",
        "/analysis/cna/tcga/gain_stats?gene=TP53",
        "/analysis/cna/tcga/gain_stats?study=BRCA"
    ],
    "loss": [
        "/analysis/cna/tcga/loss_stats?gene=cdh17&study=BRCA",
        "/analysis/cna/tcga/loss_stats?gene=TP53",
        "/analysis/cna/tcga/loss_stats?study=BRCA"
    ],
    "genes": [
        "/genes/TP53",
        "/genes/BRCA1",
        "/genes/BRCA2"
    ],
    "gene_targets": [
        "/gene_targets/TP53",
        "/gene_targets/BRCA1",
        "/gene_targets/BRCA2"
    ],
    "gene_expression": [
        "/analysis/gene_expression/tcga/stats?gene=TP53&study=BRCA",
        "/analysis/gene_expression/tcga/stats?gene=BRCA1",
        "/analysis/gene_expression/tcga/stats?study=OV"
    ],
    "mut_cna_compare_stats": [
        "/analysis/comparison/tcga/MUTvCNA_stats?gene=CDH17&study=BRCA",
        "/analysis/comparison/tcga/MUTvCNA_stats?study=BRCA",
        "/analysis/comparison/tcga/MUTvCNA_stats?gene=TP53"
    ],
    "mut_gain_compare_stats": [
        "/analysis/comparison/tcga/MUTvGAIN_stats?gene=CDH17&study=BRCA",
        "/analysis/comparison/tcga/MUTvGAIN_stats?study=BRCA",
        "/analysis/comparison/tcga/MUTvGAIN_stats?gene=TP53"
    ],
    "mut_loss_compare_stats": [
        "/analysis/comparison/tcga/MUTvLOSS_stats?gene=CDH17&study=BRCA",
        "/analysis/comparison/tcga/MUTvLOSS_stats?study=BRCA",
        "/analysis/comparison/tcga/MUTvLOSS_stats?gene=TP53"
    ],
    "snv_indel_compare_stats": [
        "/analysis/comparison/tcga/SNVvIND_stats?gene=CDH17&study=BRCA",
        "/analysis/comparison/tcga/SNVvIND_stats?study=BRCA",
        "/analysis/comparison/tcga/SNVvIND_stats?gene=TP53"
    ],
    "snv_cna_compare_stats": [
        "/analysis/comparison/tcga/SNVvCNA_stats?gene=CDH17&study=BRCA",
        "/analysis/comparison/tcga/SNVvCNA_stats?study=BRCA",
        "/analysis/comparison/tcga/SNVvCNA_stats?gene=TP53"
    ],
    "snv_gain_compare_stats": [
        "/analysis/comparison/tcga/SNVvGAIN_stats?gene=CDH17&study=BRCA",
        "/analysis/comparison/tcga/SNVvGAIN_stats?study=BRCA",
        "/analysis/comparison/tcga/SNVvGAIN_stats?gene=TP53"
    ],
    "snv_loss_compare_stats": [
        "/analysis/comparison/tcga/SNVvLOSS_stats?gene=CDH17&study=BRCA",
        "/analysis/comparison/tcga/SNVvLOSS_stats?study=BRCA",
        "/analysis/comparison/tcga/SNVvLOSS_stats?gene=TP53"
    ],
    "ind_cna_compare_stats": [
        "/analysis/comparison/tcga/INDvCNA_stats?gene=CDH17&study=BRCA",
        "/analysis/comparison/tcga/INDvCNA_stats?study=BRCA",
        "/analysis/comparison/tcga/INDvCNA_stats?gene=TP53"
    ],
    "ind_gain_compare_stats": [
        "/analysis/comparison/tcga/INDvGAIN_stats?gene=CDH17&study=BRCA",
        "/analysis/comparison/tcga/INDvGAIN_stats?study=BRCA",
        "/analysis/comparison/tcga/INDvGAIN_stats?gene=TP53"
    ],
    "ind_loss_compare_stats": [
        "/analysis/comparison/tcga/INDvLOSS_stats?gene=CDH17&study=BRCA",
        "/analysis/comparison/tcga/INDvLOSS_stats?study=BRCA",
        "/analysis/comparison/tcga/INDvLOSS_stats?gene=TP53"
    ],
    "gain_loss_compare_stats": [
        "/analysis/comparison/tcga/GAINvLOSS_stats?gene=CDH17&study=BRCA",
        "/analysis/comparison/tcga/GAINvLOSS_stats?study=BRCA",
        "/analysis/comparison/tcga/GAINvLOSS_stats?gene=TP53"
    ]
};

const plots_ep_path_dict = {
    "MUT_plot": [
        "/analysis/mutations/tcga/MUT_plot?gene=TP53&study=OV&style=domstack",
        "/analysis/mutations/tcga/MUT_plot?gene=BRCA1&style=bar",
        "/analysis/mutations/tcga/MUT_plot?study=BRCA&style=bar"
    ],
    "IND_plot": [
        "/analysis/mutations/tcga/IND_plot?gene=BRCA1&study=OV&style=domstack",
        "/analysis/mutations/tcga/IND_plot?gene=BRCA1&style=bar",
        "/analysis/mutations/tcga/IND_plot?study=BRCA&style=bar"
    ],
    "SNV_plot": [
        "/analysis/mutations/tcga/SNV_plot?gene=TP53&study=BRCA&style=domstack",
        "/analysis/mutations/tcga/SNV_plot?gene=HIF1A&style=bar",
        "/analysis/mutations/tcga/SNV_plot?study=BRCA&style=bar"
    ],
    "cna_plot": [
        "/analysis/cna/tcga/cna_plot?gene=CDH17&study=BRCA",
        "/analysis/cna/tcga/cna_plot?gene=TP53",
        "/analysis/cna/tcga/cna_plot?study=OV"
    ],
    "gain_plot": [
        "/analysis/cna/tcga/gain_plot?gene=CDH17&study=BRCA",
        "/analysis/cna/tcga/gain_plot?gene=TP53",
        "/analysis/cna/tcga/gain_plot?study=OV"
    ],
    "loss_plot": [
        "/analysis/cna/tcga/loss_plot?gene=CDH17&study=BRCA",
        "/analysis/cna/tcga/loss_plot?gene=TP53",
        "/analysis/cna/tcga/loss_plot?study=OV"
    ],
    "gene_expression_plot": [
        "/analysis/gene_expression/tcga/plot?gene=CDH1&study=OV",
        "/analysis/gene_expression/tcga/plot?gene=TP53",
        "/analysis/gene_expression/tcga/plot?study=BRCA"
    ],
    "mut_cna_compare_plot": [
        "/analysis/comparison/tcga/MUTvCNA_plot?gene=CDH17&study=BRCA",
        "/analysis/comparison/tcga/MUTvCNA_plot?study=BRCA",
        "/analysis/comparison/tcga/MUTvCNA_plot?gene=TP53"
    ],
    "mut_gain_compare_plot": [
        "/analysis/comparison/tcga/MUTvGAIN_plot?gene=CDH17&study=BRCA",
        "/analysis/comparison/tcga/MUTvGAIN_plot?study=BRCA",
        "/analysis/comparison/tcga/MUTvGAIN_plot?gene=TP53"
    ],
    "mut_loss_compare_plot": [
        "/analysis/comparison/tcga/MUTvLOSS_plot?gene=CDH17&study=BRCA",
        "/analysis/comparison/tcga/MUTvLOSS_plot?study=BRCA",
        "/analysis/comparison/tcga/MUTvLOSS_plot?gene=TP53"
    ],
    "snv_indel_compare_plot": [
        "/analysis/comparison/tcga/SNVvIND_plot?gene=CDH17&study=BRCA",
        "/analysis/comparison/tcga/SNVvIND_plot?study=BRCA",
        "/analysis/comparison/tcga/SNVvIND_plot?gene=TP53"
    ],
    "snv_cna_compare_plot": [
        "/analysis/comparison/tcga/SNVvCNA_plot?gene=CDH17&study=BRCA",
        "/analysis/comparison/tcga/SNVvCNA_plot?study=BRCA",
        "/analysis/comparison/tcga/SNVvCNA_plot?gene=TP53"
    ],
    "snv_gain_compare_plot": [
        "/analysis/comparison/tcga/SNVvGAIN_plot?gene=CDH17&study=BRCA",
        "/analysis/comparison/tcga/SNVvGAIN_plot?study=BRCA",
        "/analysis/comparison/tcga/SNVvGAIN_plot?gene=TP53"
    ],
    "snv_loss_compare_plot": [
        "/analysis/comparison/tcga/SNVvLOSS_plot?gene=CDH17&study=BRCA",
        "/analysis/comparison/tcga/SNVvLOSS_plot?study=BRCA",
        "/analysis/comparison/tcga/SNVvLOSS_plot?gene=TP53"
    ],
    "ind_cna_compare_plot": [
        "/analysis/comparison/tcga/INDvCNA_plot?gene=CDH17&study=BRCA",
        "/analysis/comparison/tcga/INDvCNA_plot?study=BRCA",
        "/analysis/comparison/tcga/INDvCNA_plot?gene=TP53"
    ],
    "ind_gain_compare_plot": [
        "/analysis/comparison/tcga/INDvGAIN_plot?gene=CDH17&study=BRCA",
        "/analysis/comparison/tcga/INDvGAIN_plot?study=BRCA",
        "/analysis/comparison/tcga/INDvGAIN_plot?gene=TP53"
    ],
    "ind_loss_compare_plot": [
        "/analysis/comparison/tcga/INDvLOSS_plot?gene=CDH17&study=BRCA",
        "/analysis/comparison/tcga/INDvLOSS_plot?study=BRCA",
        "/analysis/comparison/tcga/INDvLOSS_plot?gene=TP53"
    ],
    "gain_loss_compare_plot": [
        "/analysis/comparison/tcga/GAINvLOSS_plot?gene=CDH17&study=BRCA",
        "/analysis/comparison/tcga/GAINvLOSS_plot?study=BRCA",
        "/analysis/comparison/tcga/GAINvLOSS_plot?gene=TP53"
    ]
};

const oov_mapper_ep_path_dict = { "mapper_model": [
    "/entity_mappings?query=press%20cancell",
    "/entity_mappings?query=barack%20obama",
    "/entity_mappings?query=domin",
]};

const request_async = function (url, timeout) {
    const controller = new AbortController();
    const signal = controller.signal;
    const headers = {};
    setTimeout(() => {
        controller.abort();
    }, timeout);

    return fetch(url, {
        headers, signal, agent
    }).then(async (response) => {
        if (response.ok) {
            return {
                "url": url, "status_code": response.status
            };
        } else {
            const body = await response.json();
            return {
                "url": url, "status_code": response.status, "body": body
            };
        }
    }).catch((err) => {
        return {
            "url": url, "error": err
        };
    });
};

function get_melvin_state_with_dtype(dtype) {
    return JSON.stringify({
        "gene":                   "TP53",
        "study":                  "BRCA",
        [MelvinAttributes.DTYPE]: dtype
    });
}

function get_splitby_state_with_dtype(dtype) {
    return JSON.stringify({
        "gene":                   "CDH1",
        "study":                  "BRCA",
        [MelvinAttributes.DTYPE]: dtype
    });
}

function generate_urls_from_paths(endpoint, endpoint_paths, region, cred_data) {
    const service_urls = [];
    for (const ep_path of endpoint_paths) {
        let ep_url = new URL(endpoint + ep_path);
        let signed_req = sign_request(ep_url, region, cred_data, true);
        service_urls.push(build_presigned_url(signed_req));
    }
    return service_urls;
}

function get_splitby_stats_url(endpoint, dtypes) {
    let splitby_url = "";
    switch (dtypes[0] + ":" + dtypes[1]) {
    case "GAIN:GAIN":
        splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/GAINsGAIN_stats`);
        break;
    case "GAIN:LOSS":
        splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/GAINsLOSS_stats`);
        break;
    case "LOSS:LOSS":
        splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/LOSSsLOSS_stats`);
        break;
    case "CNA:CNA":
        splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/CNAsCNA_stats`);
        break;
    case "CNA:GAIN":
        splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/CNAsGAIN_stats`);
        break;
    case "CNA:LOSS":
        splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/CNAsLOSS_stats`);
        break;
    case "INDELS:INDELS":
        splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/INDsIND_stats`);
        break;
    case "INDELS:CNA":
        splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/INDsCNA_stats`);
        break;
    case "INDELS:GAIN":
        splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/INDsGAIN_stats`);
        break;
    case "INDELS:LOSS":
        splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/INDsLOSS_stats`);
        break;
    case "SNV:SNV":
        splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/SNVsSNV_stats`);
        break;
    case "SNV:INDELS":
        splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/SNVsIND_stats`);
        break;
    case "SNV:CNA":
        splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/SNVsCNA_stats`);
        break;
    case "SNV:GAIN":
        splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/SNVsGAIN_stats`);
        break;
    case "SNV:LOSS":
        splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/SNVsLOSS_stats`);
        break;
    case "MUTATIONS:MUTATIONS":
        splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/MUT_stats`);
        break;
    // case "MUTATIONS:SNV":
    //     splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/MUT_stats`);
    //     break;
    // case "MUTATIONS:INDELS":
    //     splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/MUT_stats`);
    //     break;
    // case "MUTATIONS:CNA":
    //     splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/MUT_stats`);
    //     break;
    // case "MUTATIONS:GAIN":
    //     splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/MUT_stats`);
    //     break;
    // case "MUTATIONS:LOSS":
    //     splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/MUT_stats`);
    //     break;
    case "GENE_EXPRESSION:MUTATIONS":
        splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/EXP_stats`);
        break;
    // case "GENE_EXPRESSION:SNV":
    //     splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/EXP_stats`);
    //     break;
    // case "GENE_EXPRESSION:INDELS":
    //     splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/EXP_stats`);
    //     break;
    // case "GENE_EXPRESSION:CNA":
    //     splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/EXP_stats`);
    //     break;
    // case "GENE_EXPRESSION:GAIN":
    //     splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/EXP_stats`);
    //     break;
    // case "GENE_EXPRESSION:LOSS":
    //     splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/EXP_stats`);
    //     break;
    }

    return splitby_url;
}

function get_splitby_plots_url(endpoint, dtypes) {
    let splitby_url = "";
    switch (dtypes[0] + ":" + dtypes[1]) {
    case "GAIN:GAIN":
        splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/GAINsGAIN_plot`);
        break;
    case "GAIN:LOSS":
        splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/GAINsLOSS_plot`);
        break;
    case "LOSS:LOSS":
        splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/LOSSsLOSS_plot`);
        break;
    case "CNA:CNA":
        splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/CNAsCNA_plot`);
        break;
    case "CNA:GAIN":
        splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/CNAsGAIN_plot`);
        break;
    case "CNA:LOSS":
        splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/CNAsLOSS_plot`);
        break;
    case "INDELS:INDELS":
        splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/INDsIND_plot`);
        break;
    case "INDELS:CNA":
        splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/INDsCNA_plot`);
        break;
    case "INDELS:GAIN":
        splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/INDsGAIN_plot`);
        break;
    case "INDELS:LOSS":
        splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/INDsLOSS_plot`);
        break;
    case "SNV:SNV":
        splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/SNVsSNV_plot`);
        break;
    case "SNV:INDELS":
        splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/SNVsIND_plot`);
        break;
    case "SNV:CNA":
        splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/SNVsCNA_plot`);
        break;
    case "SNV:GAIN":
        splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/SNVsGAIN_plot`);
        break;
    case "SNV:LOSS":
        splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/SNVsLOSS_plot`);
        break;
    case "MUTATIONS:MUTATIONS":
        splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/MUT_plot`);
        break;
    // case "MUTATIONS:SNV":
    //     splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/MUT_plot`);
    //     break;
    // case "MUTATIONS:INDELS":
    //     splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/MUT_plot`);
    //     break;
    // case "MUTATIONS:CNA":
    //     splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/MUT_plot`);
    //     break;
    // case "MUTATIONS:GAIN":
    //     splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/MUT_plot`);
    //     break;
    // case "MUTATIONS:LOSS":
    //     splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/MUT_plot`);
    //     break;
    case "GENE_EXPRESSION:MUTATIONS":
        splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/EXP_plot`);
        break;
    // case "GENE_EXPRESSION:SNV":
    //     splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/EXP_plot`);
    //     break;
    // case "GENE_EXPRESSION:INDELS":
    //     splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/EXP_plot`);
    //     break;
    // case "GENE_EXPRESSION:CNA":
    //     splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/EXP_plot`);
    //     break;
    // case "GENE_EXPRESSION:GAIN":
    //     splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/EXP_plot`);
    //     break;
    // case "GENE_EXPRESSION:LOSS":
    //     splitby_url = new URL(`${endpoint}/analysis/splitby/tcga/EXP_plot`);
    //     break;
    }

    return splitby_url;
}

function get_melvin_splitby_stats_urls(endpoint, region, cred_data) {
    const splitby_urls = [];

    for (var index = 0; index < SUPPORTED_SPLITBY_DTYPES.length; index++) {
        const splitby_url = get_splitby_stats_url(endpoint, SUPPORTED_SPLITBY_DTYPES[index]);
        if (splitby_url === "") {
            continue;
        }
        splitby_url.searchParams.set("melvin_state", get_melvin_state_with_dtype(SUPPORTED_SPLITBY_DTYPES[index][0]));
        splitby_url.searchParams.set("splitby_state", get_splitby_state_with_dtype(SUPPORTED_SPLITBY_DTYPES[index][1]));
        const signed_req = sign_request(splitby_url, region, cred_data, true);
        splitby_urls.push(build_presigned_url(signed_req));
    }

    return splitby_urls;
}

function get_melvin_splitby_plot_urls(endpoint, region, cred_data) {
    const splitby_urls = [];

    for (var index = 0; index < SUPPORTED_SPLITBY_DTYPES.length; index++) {
        const splitby_url = get_splitby_plots_url(endpoint, SUPPORTED_SPLITBY_DTYPES[index]);
        if (splitby_url === "") {
            continue;
        }
        splitby_url.searchParams.set("melvin_state", get_melvin_state_with_dtype(SUPPORTED_SPLITBY_DTYPES[index][0]));
        splitby_url.searchParams.set("splitby_state", get_splitby_state_with_dtype(SUPPORTED_SPLITBY_DTYPES[index][1]));
        const signed_req = sign_request(splitby_url, region, cred_data, true);
        splitby_urls.push(build_presigned_url(signed_req));
    }

    return splitby_urls;
}


const send_parallel_requests = async function (request_id) {
    const response = {};
    try {
        /*
         group endpoints separate sets in order to increase the parallelism
         Parallel requests for a unique endpoint must be initiated at same time in order to
         hit all instances of a Lambda function 
         */
        const results = {};

        // get auth creds via STS
        const creds_data = await assume_role(MELVIN_API_INVOKE_ROLE, request_id);

        for (let cat_item in oov_mapper_ep_path_dict) {
            const cat_url_list = generate_urls_from_paths(OOV_MAPPER_ENDPOINT, oov_mapper_ep_path_dict[cat_item]
                , OOV_MAPPER_REGION, creds_data);
            results[cat_item] = await allSettled(cat_url_list.map((url) => request_async(url, MAPPER_EP_TIMEOUT)));
        }

        for (let cat_item in stats_ep_path_dict) {
            const cat_url_list = generate_urls_from_paths(MELVIN_EXPLORER_ENDPOINT, stats_ep_path_dict[cat_item]
                , MELVIN_EXPLORER_REGION, creds_data);
            results[cat_item] = await allSettled(cat_url_list.map((url) => request_async(url, STATS_EP_TIMEOUT)));
        }

        const plots_promises = [];
        for (let cat_item in plots_ep_path_dict) {
            const cat_url_list = generate_urls_from_paths(MELVIN_EXPLORER_ENDPOINT, plots_ep_path_dict[cat_item]
                , MELVIN_EXPLORER_REGION, creds_data);
            cat_url_list.map((url) => plots_promises.push(request_async(url, PLOT_EP_TIMEOUT)));
        }
        results["plots_results"] = await allSettled(plots_promises);

        const splitby_stats_urls = get_melvin_splitby_stats_urls(MELVIN_EXPLORER_ENDPOINT,
            MELVIN_EXPLORER_REGION, creds_data);
        console.info(`splitby_stats_urls: ${JSON.stringify(splitby_stats_urls)}`);
        splitby_stats_urls.forEach(async function (url_item, index) {
            const repeat_url_items = Array(PARALLEL_REQUEST_COUNT).fill(url_item);
            const results_key = "splitby_stats_" + index;
            results[results_key] = await allSettled(repeat_url_items.map(
                (data) => request_async(data, STATS_EP_TIMEOUT)));
        });

        const splitby_plot_urls = get_melvin_splitby_plot_urls(MELVIN_EXPLORER_ENDPOINT,
            MELVIN_EXPLORER_REGION, creds_data);
        splitby_plot_urls.forEach(async function (url_item, index) {
            const repeat_url_items = Array(PARALLEL_REQUEST_COUNT).fill(url_item);
            const results_key = "splitby_plot_" + index;
            results[results_key] = await allSettled(repeat_url_items.map(
                (data) => request_async(data, PLOT_EP_TIMEOUT)));

        });

        response["data"] = results;
    } catch (err) {
        response["error"] = err;
        console.error(`[send_parallel_requests] error: ${JSON.stringify(err)}`, err);
    }
    return response;
};

async function disable_warmup_cloudwatch_rule() {
    const cloudwatchevents = new AWS.CloudWatchEvents();
    const params = { Name: process.env.WARMUP_EVENT_RULE_NAME };

    try {
        const result = await cloudwatchevents.describeRule(params).promise();
        console.info(`[warmup_handler] warmup event rule: ${JSON.stringify(result)}`);
        const timestamp = moment().valueOf().toString();
        const description = `warmup service cloudwatch rule | last_updated: ${timestamp}`;
        const cloudwatchevent_params = {
            Name:               params.Name,
            Description:        description,
            ScheduleExpression: `rate(${process.env.WARMUP_EVENT_SCHEDULE_RATE} minutes)`,
            State:              "DISABLED"
        };
        const update_result = await cloudwatchevents.putRule(cloudwatchevent_params).promise();
        console.info(`[warmup_handler] disable_warmup_cloudwatch_rule | success: ${JSON.stringify(update_result)}`);
    } catch (err) {
        console.error(`[warmup_handler] disable_warmup_cloudwatch_rule | error: ${JSON.stringify(err)}`, err);
    }
}

const handler = async function (event, context, callback) {
    console.info(`[warmup_handler] event: ${JSON.stringify(event)}, context: ${JSON.stringify(context)}`);
    let response = {};
    let warmup_result = {};
    if (WARMUP_SERVICE_ENABLED) {
        warmup_result = await send_parallel_requests(context.awsRequestId);
        try {
            let recent_sessions = await sessions_doc.getRecentSessions(WARMUP_SESSION_TIMEOUT);
            if (recent_sessions.length == 0) {
                console.info("[warmup_handler] No recent user sessions found, disabling rule...");
                await disable_warmup_cloudwatch_rule();
            } else {
                console.error("[warmup_handler] ${recent_sessions.length} recent user sessions found, " +
                    "no changes will be made to cloudwatch rules");
            }
            response = {
                statusCode: response.status,
                body:       {
                    message: warmup_result,
                    input:   event,
                },
            };
        } catch (err) {
            console.error(`[warmup_handler] Failed to perform idle check | ${JSON.stringify(err)}`);
            response = {
                statusCode: 500,
                body:       err,
            };
        }
    } else {
        response = {
            statusCode: 409,
            body:       "service disabled",
        };
        console.info("[warmup_handler] service is disabled");
    }

    console.info(`[warmup_handler] warmup_result: ${JSON.stringify(warmup_result, null, 4)}`);
    callback(null, response);
};

exports.handler = handler;