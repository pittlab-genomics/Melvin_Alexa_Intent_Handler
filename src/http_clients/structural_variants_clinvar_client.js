const https = require('request');
const URL = require('url').URL;

const {
    MELVIN_EXPLORER_ENDPOINT,
    MelvinIntentErrors,
    melvin_error
} = require('../common.js');

const { add_query_params } = require('../utils/response_builder_utils.js');

const get_sv_clinvar_stats = function (params) {
    const sv_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/structural_variants/clinvar/stats`);
    add_query_params(sv_url, params);
    var options = { json: true };

    return new Promise(function (resolve, reject) {
        https(sv_url.href, options, function (error, response, body) {
            console.info(`[get_sv_clinvar_stats] url: ${sv_url.href}, response: ${JSON.stringify(response)}`);
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
                    "Sorry, I'm having trouble accessing structural variants data."));
            }
            resolve(body);
        });
    });
};

module.exports = {
    get_sv_clinvar_stats
}
