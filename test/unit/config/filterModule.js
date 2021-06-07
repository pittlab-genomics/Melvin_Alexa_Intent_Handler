var AWS = require("aws-sdk-mock");
const nock = require("nock");
const { MelvinExplorerInterceptor } = require("./melvin_explorer");
const { oovMapperInterceptor } = require("./oov_mapper");

module.exports = { 
    onTestSuiteStart: (test) => {
        oovMapperInterceptor();
        MelvinExplorerInterceptor.mutation_tcga_stats();
        MelvinExplorerInterceptor.cna_tcga_stats();
        MelvinExplorerInterceptor.gain_tcga_stats();
        MelvinExplorerInterceptor.loss_tcga_stats();
        MelvinExplorerInterceptor.gene_by_name();
        MelvinExplorerInterceptor.gene_expression_tcga_stats();
        MelvinExplorerInterceptor.indels_tcga_stats();
        MelvinExplorerInterceptor.snv_tcga_stats();
        MelvinExplorerInterceptor.splitby_tcga_stats();
        MelvinExplorerInterceptor.compare_tcga_stats();

        AWS.mock("DynamoDB.DocumentClient", "put", function(params, callback) {
            callback(null, "successfully put item in database");
        });

        AWS.mock("DynamoDB.DocumentClient", "query", function(params, callback) {
            callback(null, {
                Items:
                [ {
                    session_start: 123,
                    session_id:    "abc" 
                } ],
                Count:        1,
                ScannedCount: 1 
            });
        });

        AWS.mock("DynamoDB.DocumentClient", "scan", function(params, callback) {
            callback(null, {});
        });

        AWS.mock("SQS", "sendMessage", function(params, callback) {
            callback(null, "successfully published message");
        });

        AWS.mock("CloudWatchEvents", "putRule", function(params, callback) {
            callback(null, "successfully put rule");
        });

        AWS.mock("CloudWatchEvents", "listTagsForResource", function(params, callback) {
            callback(null, { Tags: [{
                Key: "label", Value: "melvin-alexa-intent-handlers-test-warmup_service"
            }]});
        });

        AWS.mock("STS", "assumeRole", function(params, callback) {
            callback(null, { Credentials: {
                SecretAccessKey: "",
                AccessKeyId:     ""
            }});
        });
    },
    onTestSuiteEnd: (testResults) => {
        nock.cleanAll();
        AWS.restore("DynamoDB.DocumentClient");
        AWS.restore("SQS");
        AWS.restore("CloudWatchEvents");
        AWS.restore("STS");
    } 
};