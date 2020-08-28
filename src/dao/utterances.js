var AWS = require("aws-sdk");
var _ = require('lodash');

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
    }
}

utterances_doc.prototype.getUtteranceByTimestamp = async function (user_id, timestamp) {
    let utterance_list = [];

    console.log(`[utterances_doc] querying utterance for user_id: ${user_id}, timestamp: ${timestamp}`);
    var query_params = {
        TableName: process.env.DYNAMODB_TABLE_USER_UTTERANCE,
        ProjectionExpression: "utterance_id, melvin_history, melvin_state",
        KeyConditionExpression: "#user_id = :uid AND contains(#utterance_id, :timestamp)",
        ExpressionAttributeNames: {
            "#user_id": "user_id",
            "#utterance_id": "utterance_id"
        },
        ExpressionAttributeValues: {
            ":uid": user_id,
            ":timestamp": `_${timestamp}`
        },
        ScanIndexForward: false,
        Limit: 1
    };

    utterance_list = await queryEntireTable(docClient, query_params);
    console.info(`[utterances_doc] getUtteranceByTimestamp utterance_list.len: ${utterance_list.length}`)
    return utterance_list;
}

utterances_doc.prototype.get_last_n_events = async function (user_id, count, event_type) {
    let utterance_list = [];

    console.log(`[utterances_doc] querying utterance for user_id: ${user_id}, count: ${count}`);
    var query_params = {
        TableName: process.env.DYNAMODB_TABLE_USER_UTTERANCE,
        ProjectionExpression: "utterance_id, melvin_state, melvin_response, event_type",
        KeyConditionExpression: "#user_id = :uid",
        FilterExpression: "#event_type = :event_type",
        ExpressionAttributeNames: {
            "#user_id": "user_id",
            "#event_type": "event_type"
        },
        ExpressionAttributeValues: {
            ":uid": user_id,
            ":event_type": event_type
        },
        ScanIndexForward: false,
        Limit: count
    };

    utterance_list = await queryEntireTable(docClient, query_params);
    console.info(`[utterances_doc] [get_last_n_events] utterance_list.len: ${utterance_list.length}`)
    return utterance_list;
}


utterances_doc.prototype.getMostRecentUtterance = async function (user_id, session_id) {
    let utterance_list = [];

    console.log(`[utterances_doc] querying most recent utterance for user_id: ${user_id}, session_id: ${session_id}`);
    var query_params = {
        TableName: process.env.DYNAMODB_TABLE_USER_UTTERANCE,
        ProjectionExpression: "utterance_id, melvin_history, melvin_state",
        KeyConditionExpression: "#user_id = :uid AND contains(#utterance_id, :sid)",
        ExpressionAttributeNames: {
            "#user_id": "user_id",
            "#utterance_id": "utterance_id"
        },
        ExpressionAttributeValues: {
            ":uid": user_id,
            ":sid": session_id
        },
        ScanIndexForward: false,
        Limit: 1
    };

    utterance_list = await queryEntireTable(docClient, query_params);
    console.info(`[utterances_doc] getMostRecentUtterance utterance_list.len: ${utterance_list.length}`)

    return utterance_list;
}

module.exports = new utterances_doc();