var AWS = require("aws-sdk-mock");
const nock = require("nock");
const { MelvinExplorerInterceptor } = require("./melvin_explorer");
const { oovMapperInterceptor } = require("./oov_mapper");

module.exports = { 
    onTestSuiteStart: (test) => {
        AWS.mock("DynamoDB.DocumentClient", "put", function(params, callback) {
            callback(null, "successfully put item in database");
        });
    },
    onRequest: (test, request) => {
        oovMapperInterceptor();
        MelvinExplorerInterceptor.mutation_tcga_stats();
        MelvinExplorerInterceptor.cna_tcga_stats();
        MelvinExplorerInterceptor.gain_tcga_stats();
        MelvinExplorerInterceptor.loss_tcga_stats();

        request.requestFiltered = true;
    },
    onResponse: (test, response) => {
        nock.cleanAll();
    },
    onTestSuiteEnd: (testResults) => {
        AWS.restore("DynamoDB.DocumentClient");
    } 
};