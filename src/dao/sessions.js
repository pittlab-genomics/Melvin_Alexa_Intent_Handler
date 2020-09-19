var AWS = require("aws-sdk");
var _ = require("lodash");
const moment = require("moment");

const {
    queryEntireTable, scanEntireTable 
} = require("./dao_utils.js");

AWS.config.update({ region: "eu-west-1" });
var docClient = new AWS.DynamoDB.DocumentClient();


var sessions_doc = function () { };

sessions_doc.prototype.addUserSession = async (record) => {
    const params = {
        TableName: process.env.DYNAMODB_TABLE_USER_SESSION,
        Item:      record
    };
    try {
        const data = await docClient.put(params).promise();
        console.log(`[sessions_doc] saved user session: ${JSON.stringify(data)} | `
            + `TableName: ${process.env.DYNAMODB_TABLE_USER_SESSION}`);
        return data;
    } catch (error) {
        console.log(`Unable to insert user session => ${JSON.stringify(params)}`, error);
    }
};

sessions_doc.prototype.getMostRecentSession = async (user_id) => {
    let session_list = [];
    console.log(`[sessions_doc] querying most recent session for user_id: ${user_id}`);
    var query_params = {
        TableName:                 process.env.DYNAMODB_TABLE_USER_SESSION,
        ProjectionExpression:      "session_start, session_id",
        KeyConditionExpression:    "#user_id = :uid",
        ExpressionAttributeNames:  { "#user_id": "user_id", },
        ExpressionAttributeValues: { ":uid": user_id },
        ScanIndexForward:          false,
        Limit:                     10
    };

    session_list = await queryEntireTable(docClient, query_params);
    console.info(`[getMostRecentSession] session_list: ${JSON.stringify(session_list)}`);
    return session_list;
};


sessions_doc.prototype.getRecentSessions = async (duration=3600) => {
    let session_list = [];
    const timestamp = moment().valueOf();
    const duration_ms = duration * 1000;
    const start_timestamp = timestamp - duration_ms;
    console.log(`[sessions_doc] querying most recent session after timestamp: ${start_timestamp}`);
    var query_params = {
        TableName:                 process.env.DYNAMODB_TABLE_USER_SESSION,
        ProjectionExpression:      "session_start, session_id",
        FilterExpression:          "#session_start > :start",
        ExpressionAttributeNames:  { "#session_start": "session_start" },
        ExpressionAttributeValues: { ":start": start_timestamp },
        ScanIndexForward:          false,
        Limit:                     10
    };

    session_list = await scanEntireTable(docClient, query_params);
    console.info(`[getRecentSession] session_list: ${JSON.stringify(session_list)}`);
    return session_list;
};

module.exports = new sessions_doc();