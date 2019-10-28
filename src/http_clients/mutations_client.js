const https = require('request');
const URL = require('url').URL;

const { MELVIN_EXPLORER_ENDPOINT } = require('../common.js');


const get_mutated_patient_stats = function (params) {
    const mutations_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/patient_stats`);
    mutations_url.searchParams.set('gene', params.gene_name);
    if (params['study_id']) {
        mutations_url.searchParams.set('study', params.study_id);
    }
    var options = { json: true };

    return new Promise(function (resolve, reject) {
        https(mutations_url.href, options, function (error, response, body) {
            // in addition to parsing the value, deal with possible errors
            if (error) return reject(new Error("Error retrieving data from Melvin Explorer service", error));

            if (response.statusCode < 200 || response.statusCode > 299) {
                return reject(new Error(`Error retrieving data from Melvin Explorer service: ${mutations_url.href}`));
            }

            console.log(`MELVIN_EXPLORER API RESPONSE | [url]: ${mutations_url.href}, [body]: ${JSON.stringify(body)}`);
            resolve(body);
        });
    });
};

const get_mutations_top_list = function (params) {
    const mutations_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/mutations_top_list`);
    mutations_url.searchParams.set('gene', params.gene_name);
    if (params['study_id']) {
        mutations_url.searchParams.set('study', params.study_id);
    }
    var options = { json: true };

    return new Promise(function (resolve, reject) {
        https(mutations_url.href, options, function (error, response, body) {
            // in addition to parsing the value, deal with possible errors
            if (error) return reject(new Error("Error retrieving data from Melvin Explorer service", error));

            if (response.statusCode < 200 || response.statusCode > 299) {
                return reject(new Error(`Error retrieving data from Melvin Explorer service: ${mutations_url.href}`));
            }

            console.log(`MELVIN_EXPLORER API RESPONSE | [url]: ${mutations_url.href}, [body]: ${JSON.stringify(body)}`);
            resolve(body);
        });
    });
}

const get_mutations_domain_percent = function (params) {
    const mutations_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/domain_percent`);
    mutations_url.searchParams.set('gene', params.gene_name);
    if (params['study_id']) {
        mutations_url.searchParams.set('study', params.study_id);
    }
    var options = { json: true };

    return new Promise(function (resolve, reject) {
        https(mutations_url.href, options, function (error, response, body) {
            // in addition to parsing the value, deal with possible errors
            if (error) return reject(new Error("Error retrieving data from Melvin Explorer service", error));

            if (response.statusCode < 200 || response.statusCode > 299) {
                return reject(new Error(`Error retrieving data from Melvin Explorer service: ${mutations_url.href}`));
            }

            console.log(`MELVIN_EXPLORER API RESPONSE | [url]: ${mutations_url.href}, [body]: ${JSON.stringify(body)}`);
            resolve(body);
        });
    });
}

module.exports = {
    get_mutated_patient_stats,
    get_mutations_top_list,
    get_mutations_domain_percent
}
