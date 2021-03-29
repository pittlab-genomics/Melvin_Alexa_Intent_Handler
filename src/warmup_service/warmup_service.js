"use strict";

const AWS = require("aws-sdk");
const fetch = require("node-fetch");
const allSettled = require("promise.allsettled");
const AbortController = require("abort-controller");
const https = require("https");
const moment = require("moment");
const _ = require("lodash");

const sessions_doc = require("../dao/sessions.js");

const agent = new https.Agent({ maxSockets: 100 });
AWS.config.update({ httpOptions: { agent: agent }});

const {
    MelvinAttributes,
    SUPPORTED_SPLITBY_DTYPES,
    MELVIN_EXPLORER_ENDPOINT,
    OOV_MAPPER_ENDPOINT,
    // STAGE
} = require("../common.js");

const stats_ep_timeout = 2500;
const plot_ep_timeout = 5000;
const mapper_ep_timeout = 5000;
const warmup_session_timeout = 600; // disable warmup rule if there is no new user sessions after X mins

/*
    make sure to include at least N number of entries for each unique path 
    since Lambda functions will be provisioned for the speicified `reservedConcurrency` limit
*/
const parallel_request_count = 3;

const stats_ep_path_dict = {
    "mutations": [
        "/analysis/mutations/tcga/stats?gene=TP53",
        "/analysis/mutations/tcga/stats?study=BRCA",
        "/analysis/mutations/tcga/stats?gene=TP53&study=BRCA"
    ],
    "domains": [
        "/analysis/mutations/tcga/domain_stats?gene=TP53&study=BRCA",
        "/analysis/mutations/tcga/domain_stats?gene=CDH1",
        "/analysis/mutations/tcga/domain_stats?study=BRCA"
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
    "gene_expression": [
        "/analysis/gene_expression/tcga/stats?gene=TP53&study=BRCA",
        "/analysis/gene_expression/tcga/stats?gene=BRCA1",
        "/analysis/gene_expression/tcga/stats?study=OV"
    ]
};

const plots_ep_path_dict = {
    "profile_plot": [
        "/analysis/mutations/tcga/profile_plot?gene=BRCA1&study=BRCA",
        "/analysis/mutations/tcga/profile_plot?gene=TP53&study=BRCA",
        "/analysis/mutations/tcga/profile_plot?gene=TP53&study=OV"
    ],
    "domain_pie_plot": [
        "/analysis/mutations/tcga/domain_pie_plot?gene=BRCA1&study=BRCA",
        "/analysis/mutations/tcga/domain_pie_plot?gene=TP53&study=OV",
        "/analysis/mutations/tcga/domain_pie_plot?gene=CDH1&study=BRCA"
    ],
    "domain_stack_plot": [
        "/analysis/mutations/tcga/domain_stack_plot?gene=TP53&study=BRCA",
        "/analysis/mutations/tcga/domain_stack_plot?gene=HIF1A&study=BRCA",
        "/analysis/mutations/tcga/domain_stack_plot?gene=BRCA1&study=BRCA"
    ],
    "treemap_plot": [
        "/analysis/mutations/tcga/treemap_plot?gene=TP53",
        "/analysis/mutations/tcga/treemap_plot?gene=CDH1",
        "/analysis/mutations/tcga/treemap_plot?gene=BRCA1&study=BRCA"
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
    "mutations_cna_plot": [
        "/analysis/comparison/tcga/mutations_cna_plot?gene=CDH17&study=BRCA",
        "/analysis/comparison/tcga/mutations_cna_plot?study=BRCA",
        "/analysis/comparison/tcga/mutations_cna_plot?gene=TP53"
    ]
};

const oov_mapper_ep_path_dict = {
    "mapper_model": [
        "?query=press%20cancell",
        "?query=barack%20obama",
        "?query=domin",
        "?query=Rad%20fifty%20one%20b"
    ]
};

const request_async = function(url, timeout) {
    const controller = new AbortController();
    const signal = controller.signal;
    setTimeout(() => { 
        controller.abort();
    }, timeout);

    return fetch(url, {
        signal, agent 
    }).then((response) => {
        if (response.ok) {
            return {
                "url": url, "status_code": response.status 
            };
        } else {
            return {
                "url": url, "status_code": response.status, "body": response.text()
            };
        }
    }).catch((err) => {
        return {
            "url": url, "error": err
        };
    });
};

function get_melvin_state_with_dtype(dtype) {
    return {
        [MelvinAttributes.GENE_NAME]:   "TP53",
        [MelvinAttributes.STUDY_ABBRV]: "BRCA",
        [MelvinAttributes.DTYPE]:       dtype
    };
}

function get_splitby_state_with_dtype(dtype) {
    return {
        [MelvinAttributes.GENE_NAME]:   "CDH1",
        [MelvinAttributes.STUDY_ABBRV]: "BRCA",
        [MelvinAttributes.DTYPE]:       dtype
    };
}

function generate_urls_from_paths(endpoint, endpoint_paths) {
    const service_urls = [];
    for (const ep_path of endpoint_paths) {
        let ep_url = endpoint + ep_path;
        service_urls.push(ep_url);
    }
    return service_urls;
}

function get_melvin_splitby_stats_urls() {
    const splitby_urls = [];

    for (var index = 0; index < SUPPORTED_SPLITBY_DTYPES.length; index++) {
        let splitby_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/splitby/tcga/stats`);
        splitby_url.searchParams.set("melvin_state", 
            JSON.stringify(get_melvin_state_with_dtype(SUPPORTED_SPLITBY_DTYPES[index][0])));
        splitby_url.searchParams.set("splitby_state", 
            JSON.stringify(get_splitby_state_with_dtype(SUPPORTED_SPLITBY_DTYPES[index][1])));

        splitby_urls.push(splitby_url);
    }

    return splitby_urls;
}

function get_melvin_splitby_plot_urls() {
    const splitby_urls = [];

    for (var index = 0; index < SUPPORTED_SPLITBY_DTYPES.length; index++) {
        let splitby_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/splitby/tcga/plot`);
        splitby_url.searchParams.set("melvin_state", 
            JSON.stringify(get_melvin_state_with_dtype(SUPPORTED_SPLITBY_DTYPES[index][0])));
        splitby_url.searchParams.set("splitby_state", 
            JSON.stringify(get_splitby_state_with_dtype(SUPPORTED_SPLITBY_DTYPES[index][1])));

        splitby_urls.push(splitby_url);
    }

    return splitby_urls;
}


const send_parallel_requests = async function() {
    const response = {};
    try {
        /*
         group endpoints separate sets in order to increase the parallelism
         Parallel requests for a unique endpoint must be initiated at same time in order to
         hit all instances of a Lambda function 
         */
        const results = {};

        for (let cat_item in oov_mapper_ep_path_dict) {
            let cat_url_list = generate_urls_from_paths(OOV_MAPPER_ENDPOINT, oov_mapper_ep_path_dict[cat_item]);
            results[cat_item] = await allSettled(cat_url_list.map((data) => request_async(data, mapper_ep_timeout)));
        }

        for (let cat_item in stats_ep_path_dict) {
            let cat_url_list = generate_urls_from_paths(MELVIN_EXPLORER_ENDPOINT, stats_ep_path_dict[cat_item]);
            results[cat_item] = await allSettled(cat_url_list.map((data) => request_async(data, stats_ep_timeout)));
        }

        for (let cat_item in plots_ep_path_dict) {
            let cat_url_list = generate_urls_from_paths(MELVIN_EXPLORER_ENDPOINT, plots_ep_path_dict[cat_item]);
            results[cat_item] = await allSettled(cat_url_list.map((data) => request_async(data, plot_ep_timeout)));
        }

        const splitby_stat_urls = get_melvin_splitby_stats_urls();
        for (const [index, url_item] of splitby_stat_urls.entries()) {
            let repeat_url_items = Array(parallel_request_count).fill(url_item);
            let results_key = "splitby_stats_" + index;
            results[results_key] = await allSettled(repeat_url_items.map(
                (data) => request_async(data, stats_ep_timeout)));
        }
        

        const splitby_plot_urls = get_melvin_splitby_plot_urls();
        for (const [index, url_item] of splitby_plot_urls.entries()) {
            let repeat_url_items = Array(parallel_request_count).fill(url_item);
            let results_key = "splitby_plot_" + index;
            results[results_key] = await allSettled(repeat_url_items.map(
                (data) => request_async(data, plot_ep_timeout)));
        }

        response["data"] = results;
    } catch (err) {
        response["error"] = err;
        console.error(`[send_parallel_requests] error: ${JSON.stringify(err)}`, err);
    }
    return response;
};

async function disable_warmup_cloudwatch_rule() {
    const cloudwatchevents = new AWS.CloudWatchEvents();
    var params = {
        NamePrefix: "melvin",
        Limit:      10,
    };

    try {
        const list_result = await cloudwatchevents.listRules(params).promise();
        console.log(`[warmup_handler] listRules | success: ${JSON.stringify(list_result)}`);

        const rule_list = list_result["Rules"];
        let warmup_rule_name = null;
        for (const rule_item of rule_list) {
            console.log(`[warmup_handler] rule_item | success: ${JSON.stringify(rule_item)}`);
            var tag_params = { ResourceARN: rule_item["Arn"] };
            const tag_result = await cloudwatchevents.listTagsForResource(tag_params).promise();
            console.log(`[warmup_handler] tag_result | success: ${JSON.stringify(tag_result)}`);
            const tag_list = tag_result["Tags"];
            for (const tag_item of tag_list) {
                if (tag_item["Key"] === "label" && tag_item["Value"] === process.env.WARMUP_RULE_LABEL) {
                    warmup_rule_name = rule_item["Name"];
                }
            }
        }
        
        if (!_.isEmpty(warmup_rule_name)) {
            const timestamp = moment().valueOf().toString();
            const description = "warmup service cloudwatch rule | " + 
                `stage: ${STAGE}, last_updated: ${timestamp}`;
            const cloudwatchevent_params = {
                Name:               warmup_rule_name,
                Description:        description,
                ScheduleExpression: "rate(1 minute)",
                State:              "DISABLED",
                Tags:               [
                    {
                        Key:   "last_updated",
                        Value: timestamp
                    }
                ]
            };
            const update_result = await cloudwatchevents.putRule(cloudwatchevent_params).promise();
            console.log(`[warmup_handler] putRule | success: ${JSON.stringify(update_result)}`);
        } else {
            console.log("[warmup_handler] failed to find warmup event rule");
        }
    } catch(err) {
        console.log(`[warmup_handler] event error: ${JSON.stringify(err)}`, err.stack);
    }
}

const handler = async function (event, context, callback) {
    console.info(`[warmup_handler] event: ${JSON.stringify(event)}, context: ${JSON.stringify(context)}`);
    const result = await send_parallel_requests();

    try {
        let recent_sessions = await sessions_doc.getRecentSessions(warmup_session_timeout);
        if (recent_sessions.length == 0) {
            console.error("[warmup_handler] Recent user sessions do not exist. Disabling warmup cloudwatch rules...");
            await disable_warmup_cloudwatch_rule();
        } else {
            console.error("[warmup_handler] Recent user sessions exist, " + 
                `no changes will be made to cloudwatch rules | ${JSON.stringify(recent_sessions)}`);
        }
    } catch (err) {
        console.error(`[warmup_handler] Failed to perform idle check | ${JSON.stringify(err)}`);
    }

    const response = {
        statusCode: 200,
        body:       JSON.stringify({
            message: result,
            input:   event,
        }),
    };
    console.info(`[warmup_handler] result: ${JSON.stringify(result, null, 4)}`);
    callback(null, response);
};

exports.handler = handler;