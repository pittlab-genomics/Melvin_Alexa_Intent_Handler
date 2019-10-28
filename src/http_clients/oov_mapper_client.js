const https = require('request');
const URL = require('url').URL;

const { OOV_MAPPER_ENDPOINT } = require('../common.js');


module.exports.get_oov_mapping_by_query = function (params) {
    const oov_url = new URL(`${OOV_MAPPER_ENDPOINT}/entity_mappings`);
    oov_url.searchParams.set('query', params.query);
    var options = { json: true };

    return new Promise(function (resolve, reject) {
        https(oov_url.href, options, function (error, response, body) {
            // in addition to parsing the value, deal with possible errors
            if (error) return reject(new Error("Error retrieving data from OOVM service", error));

            if (response.statusCode < 200 || response.statusCode > 299) {
                return reject(new Error("Error retrieving data from OOVM service. Invalid response status code",
                    response.statusCode));
            }

            console.log('OOV API RESPONSE = [url] ' + oov_url.href + ', [body] ' + JSON.stringify(body));
            resolve(body);
        });
    });
};

