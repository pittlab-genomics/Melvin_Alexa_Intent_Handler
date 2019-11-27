const https = require('request');
const URL = require('url').URL;

const { MELVIN_EXPLORER_ENDPOINT,
    MelvinIntentErrors,
    melvin_error
} = require('../common.js');

const { add_query_list_params } = require('../utils/response_builder_utils.js');

module.exports.get_clinical_trials = function (params) {
    const clinical_trials_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/clinical_trials/list`);
    add_query_list_params(clinical_trials_url, params, ['location', 'distance', 'study']);
    var options = { json: true };

    return new Promise(function (resolve, reject) {
        https(clinical_trials_url.href, options, function (error, response, body) {
            console.info(`MELVIN_EXPLORER RESPONSE | [url]: ${clinical_trials_url.href}`);
            if (error) {
                return reject(new Error("Error retrieving data from Melvin Explorer service", error));
            }

            if (response.statusCode < 200 || response.statusCode > 299) {
                return reject(new Error(`Error retrieving data from Melvin Explorer service.`
                    + ` Invalid response.statusCode: ${response.statusCode}`));
            }

            if (!body['data']) {
                reject(melvin_error(`Invalid response from MELVIN_EXPLORER: ${JSON.stringify(response)}`,
                    MelvinIntentErrors.INVALID_API_RESPOSE,
                    "Sorry, I'm having trouble accessing clinical trial data."));
            }
            resolve(body);
        });
    });
};

