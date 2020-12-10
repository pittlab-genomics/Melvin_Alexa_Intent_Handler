var AWS = require("aws-sdk-mock");

module.exports = { 
    onTestSuiteStart: (test) => {
        AWS.mock("DynamoDB.DocumentClient", "put", function(params, callback) {
            callback(null, "successfully put item in database");
        });
    },
    onTestSuiteEnd: (testResults) => {
        AWS.restore("DynamoDB.DocumentClient");
    } 
};