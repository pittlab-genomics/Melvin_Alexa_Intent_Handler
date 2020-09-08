const https = require('request');
const URL = require('url').URL;

const {
    MELVIN_EXPLORER_ENDPOINT,
    MelvinIntentErrors,
    melvin_error
} = require('../common.js');


const get_splitby_tcga_stats = function (melvin_state, splitby_state) {
    const splitby_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/splitby/tcga/stats`);
    splitby_url.searchParams.set('melvin_state', JSON.stringify(melvin_state));
    splitby_url.searchParams.set('splitby_state', JSON.stringify(splitby_state));

    var options = { json: true };

    return new Promise(function (resolve, reject) {
        https(splitby_url.href, options, function (error, response, body) {
            console.info(`[get_splitby_tcga_stats] url: ${splitby_url.href}, `
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
                    "Sorry, I'm having trouble performing splitby analysis."));
            }
            resolve(body);
        });
    });
};

module.exports = {
    get_splitby_tcga_stats
}
