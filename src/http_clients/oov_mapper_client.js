const https = require("request");
const URL = require("url").URL;

const {
    OOV_MAPPER_ENDPOINT,
    MelvinIntentErrors,
    melvin_error
} = require("../common.js");

module.exports.get_oov_mapping_by_query = function (params) {
    const oov_url = new URL(`${OOV_MAPPER_ENDPOINT}/entity_mappings`);
    oov_url.searchParams.set("query", params.query);
    oov_url.searchParams.set("request_id", params.request_id);
    oov_url.searchParams.set("session_id", params.session_id);
    var options = {
        json: true 
    };

    return new Promise(function (resolve, reject) {
        https(oov_url.href, options, function (error, response, body) {
            console.info(`OOV_MAPPER RESPONSE | [url]: ${oov_url.href},`
                + ` [response]: ${JSON.stringify(response)}, [body]: ${JSON.stringify(body)}`);

            if (error) return reject(new Error("Error retrieving data from OOVM service", error));

            if (response.statusCode >= 500 && response.statusCode <= 599) {
                return reject(new Error("Error retrieving data from Melvin Explorer service."
                    + ` Invalid response.statusCode: ${response.statusCode}`));
            }

            if (!body["data"] && body["error"]) {
                reject(melvin_error(`Invalid response from MELVIN_EXPLORER: ${JSON.stringify(response)}`,
                    MelvinIntentErrors.INVALID_API_RESPOSE,
                    "Sorry, I'm having trouble understading the query. Please try again."));
            }
            resolve(body);
        });
    });
};

