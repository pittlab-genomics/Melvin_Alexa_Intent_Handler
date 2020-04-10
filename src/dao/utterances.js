var AWS = require("aws-sdk");
AWS.config.update({ region: "eu-west-1" });
var _ = require('lodash');
const moment = require('moment');

var utterances_doc = function () { };
var docClient = new AWS.DynamoDB.DocumentClient();


utterances_doc.prototype.addUserUtterance = async (record) => {
    const params = {
        TableName: process.env.DYNAMODB_TABLE_USER_UTTERANCE,
        Item: record
    };

    try {
        const data = await docClient.put(params).promise();
        console.log(`Saved user utterance: ${JSON.stringify(data)} | 
            TableName: ${process.env.DYNAMODB_TABLE_USER_UTTERANCE}`);
        return data;

    } catch (error) {
        console.log(`Unable to insert user utterance => ${JSON.stringify(params)}`, error);
        return reject("Unable to insert user utterance");
    }
}

module.exports = new utterances_doc();