const { MELVIN_EXPLORER_ENDPOINT } = require('../common.js');
const https = require('request');
const URL = require('url').URL;

module.exports.get_cnv_change_percent = function (params) {
    const cnv_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/cnvs/percent_patients`);
    cnv_url.searchParams.set('gene', params.gene_name);
    cnv_url.searchParams.set('study', params.study_id);
    var options = { json: true };

    return new Promise(function (resolve, reject) {
        https(cnv_url.href, options, function (error, response, body) {
            // in addition to parsing the value, deal with possible errors
            if (error) return reject(new Error("Error retrieving data from Melvin Explorer service", error));

            if (response.statusCode < 200 || response.statusCode > 299) {
                return reject(new Error("get_cnv_change_percent | error retrieving data from Melvin Explorer service"));
            }

            console.log('API RESPONSE = [url] ' + cnv_url.href + ', [body] ' + JSON.stringify(body));
            resolve(body);
        });
    });
};
