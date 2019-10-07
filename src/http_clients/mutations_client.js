const { GENOMIC_EXPLORER_API_BASE_URL: baseUrl } = require('../common.js');
const https = require('request');

const get_mutated_patient_stats = function (params) {
    var url = baseUrl + '/analysis/mutations/patient_stats?gene=' + params.gene_name;
    if (params['study_id']) {
        url += '&study=' + params.study_id;
    }

    var options = { json: true };

    return new Promise(function (resolve, reject) {
        https(url, options, function (error, response, body) {
            // in addition to parsing the value, deal with possible errors
            if (error) return reject(new Error("Error retrieving data from Melvin Explorer service", error));

            console.log('API RESPONSE = [url] ' + url + ', [body] ' + JSON.stringify(body));
            resolve(body);
        });
    });
};

const get_mutations_top_list = function (params) {
    var url = baseUrl + '/analysis/mutations/mutations_top_list?gene=' + params.gene_name;
    var options = { json: true };

    return new Promise(function (resolve, reject) {
        https(url, options, function (error, response, body) {
            // in addition to parsing the value, deal with possible errors
            if (error) return reject(new Error("Error retrieving data from Melvin Explorer service", error));

            console.log('API RESPONSE = [url] ' + url + ', [body] ' + JSON.stringify(body));
            resolve(body);
        });
    });
}

module.exports = {
    get_mutated_patient_stats,
    get_mutations_top_list
}
