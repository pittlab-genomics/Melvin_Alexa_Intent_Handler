var AWS = require("aws-sdk");
AWS.config.update({ region: "eu-west-1" });
var _ = require('lodash');
const moment = require('moment');

var sessions_doc = function () { };
var docClient = new AWS.DynamoDB.DocumentClient();


sessions_doc.prototype.addUserSession = async (record) => {
    const params = {
        TableName: process.env.DYNAMODB_TABLE_USER_SESSION,
        Item: record
    };
    try {
        const data = await docClient.put(params).promise();
        console.log(`Saved user session: ${JSON.stringify(data)} | 
        TableName: ${process.env.DYNAMODB_TABLE_USER_SESSION}`);
        return data;
    } catch (error) {
        console.log(`Unable to insert user session => ${JSON.stringify(params)}`, error);
    }
}

module.exports = new sessions_doc();