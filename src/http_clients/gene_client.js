const URL = require('url').URL;
const https = require('request');

const { MELVIN_EXPLORER_ENDPOINT } = require('../common.js');


module.exports.get_gene_by_name = function (params) {
    const mutations_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/genes/${params.gene_name}`);
    var options = { json: true };

    return new Promise(function (resolve, reject) {
        https(mutations_url.href, options, function (error, response, body) {
            // in addition to parsing the value, deal with possible errors
            if (error) return reject(new Error("Error retrieving data from Melvin Explorer service", error));

            if (response.statusCode < 200 || response.statusCode > 299) {
                return reject(new Error("Error retrieving data from Melvin Explorer service"));
            }

            console.log('MELVIN_EXPLORER RESPONSE = [url] ' + mutations_url.href + ', [body] ' + JSON.stringify(body));
            resolve(body);
        });
    });
};

