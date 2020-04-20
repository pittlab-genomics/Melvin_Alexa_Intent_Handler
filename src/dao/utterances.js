var AWS = require("aws-sdk");
var _ = require('lodash');
const moment = require('moment');

const { queryEntireTable, scanEntireTable } = require("./dao_utils.js");

AWS.config.update({ region: "eu-west-1" });
var docClient = new AWS.DynamoDB.DocumentClient();


var utterances_doc = function () { };

utterances_doc.prototype.addUserUtterance = async (record) => {
    const params = {
        TableName: process.env.DYNAMODB_TABLE_USER_UTTERANCE,
        Item: record
    };

    try {
        const data = await docClient.put(params).promise();
        console.log(`[utterances_doc] saved user utterance: ${JSON.stringify(data)} | `
            + `TableName: ${process.env.DYNAMODB_TABLE_USER_UTTERANCE}`);
        return data;

    } catch (error) {
        console.log(`Unable to insert user utterance => ${JSON.stringify(params)}`, error);
        return reject("Unable to insert user utterance");
    }
}

utterances_doc.prototype.getUtteranceByID = async function(user_id, createdAt) {
    let utterance_list = [];

    console.log(`[utterances_doc] querying most recent utterance for user_id: ${user_id}`);
    var query_params = {
        TableName: process.env.DYNAMODB_TABLE_USER_UTTERANCE,
        ProjectionExpression: "user_id, createdAt, melvin_history, melvin_state",
        KeyConditionExpression: "#user_id = :uid AND #createdAt = :timestamp",
        ExpressionAttributeNames: {
            "#user_id": "user_id",
            "#createdAt": "createdAt"
        },
        ExpressionAttributeValues: {
            ":uid": user_id,
            ":timestamp": createdAt
        },
        ScanIndexForward: false,
        Limit: 1
    };

    utterance_list = await queryEntireTable(docClient, query_params);
    console.info(`[utterances_doc] utterance_list: ${JSON.stringify(utterance_list)}`)
    return utterance_list;
}

utterances_doc.prototype.getMostRecentUtterance = async function (user_id, session_id) {
    let utterance_id_list = [];
    const utterance_id_prefix = `${session_id}_`;

    console.log(`[utterances_doc] querying most recent utterance for user_id: ${user_id}`);
    var query_params = {
        TableName: process.env.DYNAMODB_TABLE_USER_UTTERANCE,
        IndexName: "GlobalCreatedAtIndex",
        ProjectionExpression: "utterance_id, createdAt",
        KeyConditionExpression: "#user_id = :uid AND begins_with(#utterance_id, :utt_prefix)",
        ExpressionAttributeNames: {
            "#user_id": "user_id",
            "#utterance_id": "utterance_id"
        },
        ExpressionAttributeValues: {
            ":uid": user_id,
            ":utt_prefix": utterance_id_prefix
        },
        ScanIndexForward: false,
        Limit: 1
    };

    utterance_id_list = await queryEntireTable(docClient, query_params);
    console.info(`[utterances_doc] utterance_id_list: ${JSON.stringify(utterance_id_list)}`)

    const createdAt = utterance_id_list[0]['createdAt'];
    const utterance_list = await this.getUtteranceByID(user_id, createdAt);

    return utterance_list;
}

module.exports = new utterances_doc();