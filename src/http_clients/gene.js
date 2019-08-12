const { baseUrl } = require('../common.js');
const https = require('request');

module.exports.get_gene_by_name = function (params) {
    var url = baseUrl + '/gene/' + params.gene_name;
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

