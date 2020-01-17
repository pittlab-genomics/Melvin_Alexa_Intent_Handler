const https = require('request');
const URL = require('url').URL;

const {
    MELVIN_EXPLORER_ENDPOINT,
    MelvinIntentErrors,
    melvin_error
} = require('../common.js');

const { add_query_params } = require('../utils/response_builder_utils.js');


const get_mutations_tcga_stats = function (params) {
    const mutations_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/tcga/stats`);
    add_query_params(mutations_url, params);
    var options = { json: true };

    return new Promise(function (resolve, reject) {
        https(mutations_url.href, options, function (error, response, body) {
            console.info(`MELVIN_EXPLORER RESPONSE | [url]: ${mutations_url.href},`
                + ` [response]: ${JSON.stringify(response)}, [body]: ${JSON.stringify(body)}`);
            if (error) {
                return reject(new Error("Error retrieving data from Melvin Explorer service", error));
            }

            if (response.statusCode >= 500 && response.statusCode <= 599) {
                return reject(new Error(`Error retrieving data from Melvin Explorer service.`
                    + ` Invalid response.statusCode: ${response.statusCode}`));
            }

            if (!body['data'] && !body['error']) {
                reject(melvin_error(`Invalid response from MELVIN_EXPLORER: ${JSON.stringify(response)}`,
                    MelvinIntentErrors.INVALID_API_RESPOSE,
                    "Sorry, I'm having trouble accessing mutations data."));
            }
            resolve(body);
        });
    });
};

const get_mutations_tcga_top_genes = function (params) {
    const mutations_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/tcga/top_genes`);
    add_query_params(mutations_url, params);
    var options = { json: true };

    return new Promise(function (resolve, reject) {
        https(mutations_url.href, options, function (error, response, body) {
            console.info(`MELVIN_EXPLORER RESPONSE | [url]: ${mutations_url.href},`
                + ` [response]: ${JSON.stringify(response)}, [body]: ${JSON.stringify(body)}`);
            if (error) {
                return reject(new Error("Error retrieving data from Melvin Explorer service", error));
            }

            if (response.statusCode >= 500 && response.statusCode <= 599) {
                return reject(new Error(`Error retrieving data from Melvin Explorer service.`
                    + ` Invalid response.statusCode: ${response.statusCode}`));
            }

            if (!body['data'] && !body['error']) {
                reject(melvin_error(`Invalid response from MELVIN_EXPLORER: ${JSON.stringify(response)}`,
                    MelvinIntentErrors.INVALID_API_RESPOSE,
                    "Sorry, I'm having trouble accessing mutations data."));
            }
            resolve(body);
        });
    });
}

const get_mutations_tcga_domain_stats = function (params) {
    const mutations_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/tcga/domain_stats`);
    add_query_params(mutations_url, params);
    var options = { json: true };

    return new Promise(function (resolve, reject) {
        https(mutations_url.href, options, function (error, response, body) {
            console.info(`MELVIN_EXPLORER RESPONSE | [url]: ${mutations_url.href},`
                + ` [response]: ${JSON.stringify(response)}, [body]: ${JSON.stringify(body)}`);
            if (error) {
                return reject(new Error("Error retrieving data from Melvin Explorer service", error));
            }

            if (response.statusCode >= 500 && response.statusCode <= 599) {
                return reject(new Error(`Error retrieving data from Melvin Explorer service.`
                    + ` Invalid response.statusCode: ${response.statusCode}`));
            }

            if (!body['data'] && !body['error']) {
                reject(melvin_error(`Invalid response from MELVIN_EXPLORER: ${JSON.stringify(response)}`,
                    MelvinIntentErrors.INVALID_API_RESPOSE,
                    "Sorry, I'm having trouble accessing mutations data."));
            }
            resolve(body);
        });
    });
}

module.exports = {
    get_mutations_tcga_stats,
    get_mutations_tcga_top_genes,
    get_mutations_tcga_domain_stats
}
