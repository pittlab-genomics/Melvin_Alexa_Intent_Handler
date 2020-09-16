"use strict";
const request = require("request");
const AWS = require("aws-sdk");
const MELVIN_EXPLORER_ENDPOINT = process.env.MELVIN_EXPLORER_ENDPOINT;

const request_async = function(url) {
    return new Promise((resolve, reject) => {
        request(url, (err, response, body) => {
            if (err) {
                return reject(err, response, body);
            }
            if (response.statusCode >= 500 && response.statusCode <= 599) {
                return reject(new Error("Error retrieving data from Melvin Explorer service."
                    + ` Invalid response.statusCode: ${response.statusCode}`));
            }

            if (!body["data"] && body["error"]) {
                return reject(new Error(`Invalid response from MELVIN_EXPLORER: ${JSON.stringify(response)}`));
            }
            resolve({
                "url": url, "status_code": response.statusCode 
            });
        });
    });
};

const melvin_explorer_service_urls = [
    `${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/tcga/stats?gene=TP53`,
    `${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/tcga/stats_plot?gene=TP53`,
    `${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/tcga/profile_plot?gene=BRCA1&study=BRCA`,
    `${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/tcga/domain_stats?gene=TP53`,
    `${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/tcga/domain_pie_plot?gene=BRCA1&study=BRCA`,
    `${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/tcga/domain_stack_plot?gene=TP53&study=BRCA`,
    `${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/tcga/treemap_plot?gene=TP53&study=BRCA`,
    `${MELVIN_EXPLORER_ENDPOINT}/analysis/cna/tcga/stats?cnv_change=amplifications&gene=cdh17&study=BRCA`,
    `${MELVIN_EXPLORER_ENDPOINT}/analysis/cna/tcga/plot?gene=CDH17&study=BRCA&cnv_change=amplifications`,
    `${MELVIN_EXPLORER_ENDPOINT}/analysis/gene_expression/tcga/stats?gene=TP53&study=BRCA`,
    `${MELVIN_EXPLORER_ENDPOINT}/analysis/gene_expression/tcga/plot?gene=TP53&study=BRCA`,
    `${MELVIN_EXPLORER_ENDPOINT}/analysis/comparison/tcga/mutations_cna_plot?gene=CDH17&study=BRCA`,
    `${MELVIN_EXPLORER_ENDPOINT}/analysis/comparison/tcga/mutations_cna_plot?study=BRCA`,
    `${MELVIN_EXPLORER_ENDPOINT}/analysis/comparison/tcga/mutations_cna_plot?gene=TP53`,
    `${MELVIN_EXPLORER_ENDPOINT}/analysis/splitby/tcga/stats?melvin_state=%7B%22gene_name%22%3A%22TP53%22%2C%22study_abbreviation%22%3A%22BRCA%22%2C%22data_type%22%3A%22GENE_EXPRESSION%22%2C%22data_source%22%3A%22TCGA%22%7D&splitby_state=%7B%22gene_name%22%3A%22CDH1%22%2C%22study_abbreviation%22%3A%22BRCA%22%2C%22data_type%22%3A%22MUTATIONS%22%2C%22data_source%22%3A%22TCGA%22%7D`,
    `${MELVIN_EXPLORER_ENDPOINT}/analysis/splitby/tcga/plot?melvin_state=%7B%22gene_name%22%3A%22TP53%22%2C%22study_abbreviation%22%3A%22BRCA%22%2C%22data_type%22%3A%22GENE_EXPRESSION%22%2C%22data_source%22%3A%22TCGA%22%7D&splitby_state=%7B%22gene_name%22%3A%22CDH1%22%2C%22study_abbreviation%22%3A%22BRCA%22%2C%22data_type%22%3A%22MUTATIONS%22%2C%22data_source%22%3A%22TCGA%22%7D`
];


const send_parallel_requests = async function() {
    const response = {};
    try {
        response["data"] = await Promise.all(melvin_explorer_service_urls.map(request_async));
    } catch (err) {
        response["error"] = err;
        console.error(err);
    }
    return response;
};

const handler = async function (event, context, callback) {
    console.info(`[warmup_handler] event: ${JSON.stringify(event)}, context: ${JSON.stringify(context)}`);
    const result = await send_parallel_requests();
    const response = {
        statusCode: 200,
        body:       JSON.stringify({
            message: result,
            input:   event,
        }),
    };
    console.info(`[warmup_handler] result: ${JSON.stringify(result)}`);
    callback(null, response);
};

exports.handler = handler;