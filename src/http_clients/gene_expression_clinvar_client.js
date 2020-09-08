const https = require('request');
const URL = require('url').URL;

const {
    MELVIN_EXPLORER_ENDPOINT,
    MelvinIntentErrors,
    melvin_error
} = require('../common.js');

const { add_query_params } = require('../utils/response_builder_utils.js');


const get_gene_expression_clinvar_stats = function (params) {
    const gene_expression_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/gene_expression/clinvar/stats`);
    add_query_params(gene_expression_url, params);
    var options = { json: true };

    return new Promise(function (resolve, reject) {
        https(gene_expression_url.href, options, function (error, response, body) {
            console.info(`[get_gene_expression_clinvar_stats] url: ${gene_expression_url.href}, `
                + `response: ${JSON.stringify(response)}`);
            if (error) {
                return reject(new Error("Error retrieving data from Melvin Explorer service", error));
            }

            if (response.statusCode >= 500 && response.statusCode <= 599) {
                return reject(new Error(`Error retrieving data from Melvin Explorer service.`
                    + ` Invalid response.statusCode: ${response.statusCode}`));
            }

            if (!body['data'] && body['error']) {
                reject(melvin_error(`Invalid response from MELVIN_EXPLORER: ${JSON.stringify(response)}`,
                    MelvinIntentErrors.INVALID_API_RESPOSE,
                    "Sorry, I'm having trouble accessing expression data."));
            }
            resolve(body);
        });
    });
};

module.exports = {
    get_gene_expression_clinvar_stats
}
