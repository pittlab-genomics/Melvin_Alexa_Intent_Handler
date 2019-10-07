const { GENE_MAPPER_API_BASE_URL: baseUrl } = require('../common.js');
const https = require('request');

module.exports.get_oov_mapping_by_query = function (params) {
    var url = baseUrl + '/oov_mappings?query=' + params.query;
    var options = { json: true };

    return new Promise(function (resolve, reject) {
        https(url, options, function (error, response, body) {
            // in addition to parsing the value, deal with possible errors
            if (error) return reject(new Error("Error retrieving data from OOVM service", error));

            console.log('API RESPONSE = [url] ' + url + ', [body] ' + JSON.stringify(body));
            resolve(body);
        });
    });
};

