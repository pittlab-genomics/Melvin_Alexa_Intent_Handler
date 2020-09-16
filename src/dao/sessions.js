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
    const timestamp = moment().valueOf();
    console.log(`[sessions_doc] querying most recent session for user_id: ${user_id}`);
    var query_params = {
        TableName:                process.env.DYNAMODB_TABLE_USER_SESSION,
        ProjectionExpression:     "session_start, session_id",
        KeyConditionExpression:   "#user_id = :uid AND #session_start < :start",
        ExpressionAttributeNames: {
            "#user_id":       "user_id",
            "#session_start": "session_start"
        },
        ExpressionAttributeValues: {
            ":uid":   user_id,
            ":start": timestamp
        },
        ScanIndexForward: false,
        Limit:            10
    };

    session_list = await queryEntireTable(docClient, query_params);
    console.info(`[sessions_doc] session_list: ${JSON.stringify(session_list)}`);
    return session_list;
};

module.exports = new sessions_doc();