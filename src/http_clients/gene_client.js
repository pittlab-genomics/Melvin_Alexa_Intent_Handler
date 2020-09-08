const https = require('request');
const URL = require('url').URL;

const { MELVIN_EXPLORER_ENDPOINT,
    MelvinIntentErrors,
    melvin_error
} = require('../common.js');


module.exports.get_gene_by_name = function (params) {
    const gene_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/genes/${params.gene_name}`);
    var options = { json: true };

    return new Promise(function (resolve, reject) {
        https(gene_url.href, options, function (error, response, body) {
            console.info(`[get_gene_by_name] url: ${gene_url.href}, response: ${JSON.stringify(response)}`);
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
                    "Sorry, I'm having trouble accessing mutations data."));
            }
            resolve(body);
        });
    });
};

