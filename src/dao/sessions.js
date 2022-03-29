var AWS = require("aws-sdk");
const moment = require("moment");

const { scanEntireTable } = require("./dao_utils.js");

AWS.config.update({ region: process.env.REGION });
var docClient = new AWS.DynamoDB.DocumentClient();


var sessions_doc = function () { };

sessions_doc.prototype.addUserSession = async (record) => {
    const params = {
        TableName: process.env.DYNAMODB_TABLE_USER_SESSION,
        Item:      record
    };
    try {
        const data = await docClient.put(params).promise();
        console.info(`[sessions_doc] saved user session: ${JSON.stringify(data)} | `
            + `TableName: ${process.env.DYNAMODB_TABLE_USER_SESSION}`);
        return data;
    } catch (error) {
        console.error(`Unable to insert user session | params: ${JSON.stringify(params)}`, error);
        throw error;
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

    // Although there is no filter expression, we need to read session records before current session
    session_list = await docClient.query(query_params).promise();
    console.info(`[sessions_doc] session_list: ${JSON.stringify(session_list)}`);
    return session_list;
};


sessions_doc.prototype.getRecentSessions = async (duration = 3600) => {
    let session_list = [];
    const timestamp = moment().valueOf();
    const duration_ms = duration * 1000;
    const start_timestamp = timestamp - duration_ms;
    console.info(`[sessions_doc] querying most recent session after timestamp: ${start_timestamp}`);
    var query_params = {
        TableName:                 process.env.DYNAMODB_TABLE_USER_SESSION,
        ProjectionExpression:      "session_start, session_id",
        FilterExpression:          "#session_start > :start",
        ExpressionAttributeNames:  { "#session_start": "session_start" },
        ExpressionAttributeValues: { ":start": start_timestamp },
        ScanIndexForward:          false,
        Limit:                     1000
    };

    session_list = await scanEntireTable(docClient, query_params);
    console.info(`[sessions_doc] session_list: ${JSON.stringify(session_list)}`);
    return session_list;
};

module.exports = new sessions_doc();