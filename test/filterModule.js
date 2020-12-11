var AWS = require("aws-sdk-mock");
const nock = require("nock");
const { MelvinExplorerInterceptor } = require("./melvin_explorer");
const { oovMapperInterceptor } = require("./oov_mapper");

module.exports = { 
    onTestSuiteStart: (test) => {
        AWS.mock("DynamoDB.DocumentClient", "put", function(params, callback) {
            callback(null, "successfully put item in database");
        });

        AWS.mock("SQS", "sendMessage", function(params, callback) {
            callback(null, "successfully published message");
        });
    },
    onRequest: (test, request) => {
        oovMapperInterceptor();
        MelvinExplorerInterceptor.mutation_tcga_stats();
        MelvinExplorerInterceptor.cna_tcga_stats();
        MelvinExplorerInterceptor.gain_tcga_stats();
        MelvinExplorerInterceptor.loss_tcga_stats();
        MelvinExplorerInterceptor.gene_by_name();
        MelvinExplorerInterceptor.gene_expression_tcga_stats();

        request.requestFiltered = true;
    },
    onResponse: (test, response) => {
        nock.cleanAll();
    },
    onTestSuiteEnd: (testResults) => {
        AWS.restore("DynamoDB.DocumentClient");
        AWS.restore("SQS");
    } 
};