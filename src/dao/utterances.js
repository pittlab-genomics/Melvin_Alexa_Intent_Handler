var AWS = require("aws-sdk");
const moment = require("moment");

const {
    FOLLOW_UP_TEXT_THRESHOLD, MelvinEventTypes
} = require("../common");
const { queryEntireTable } = require("./dao_utils.js");

AWS.config.update({ region: process.env.REGION });
var docClient = new AWS.DynamoDB.DocumentClient();


var utterances_doc = function () { };

utterances_doc.prototype.addUserUtterance = async (record) => {
    const params = {
        TableName: process.env.DYNAMODB_TABLE_USER_UTTERANCE,
        Item:      record
    };

    try {
        const data = await docClient.put(params).promise();
        console.log(`[utterances_doc] saved user utterance: ${JSON.stringify(data)} | `
            + `TableName: ${process.env.DYNAMODB_TABLE_USER_UTTERANCE}`);
        return data;

    } catch (error) {
        console.log(`Unable to insert user utterance => ${JSON.stringify(params)}`, error);
    }
};

utterances_doc.prototype.getUtteranceByTimestamp = async function (user_id, timestamp) {
    let utterance_list = [];

    console.log(`[utterances_doc] querying utterance for user_id: ${user_id}, timestamp: ${timestamp}`);
    var query_params = {
        TableName:                process.env.DYNAMODB_TABLE_USER_UTTERANCE,
        ProjectionExpression:     "utterance_id, melvin_history, melvin_state",
        KeyConditionExpression:   "#user_id = :uid AND contains(#utterance_id, :timestamp)",
        ExpressionAttributeNames: {
            "#user_id":      "user_id",
            "#utterance_id": "utterance_id"
        },
        ExpressionAttributeValues: {
            ":uid":       user_id,
            ":timestamp": `_${timestamp}`
        },
        ScanIndexForward: false,
        Limit:            1
    };

    // since there is no filter expression, we can query the table once with a limit of 1.
    utterance_list = await docClient.query(query_params).promise();
    console.info(`[utterances_doc] retrieved utterances list size: ${utterance_list.length}`);
    return utterance_list;
};

utterances_doc.prototype.get_events_for_count = async function (
    user_id, session_id, count, event_type) {
    console.info(`[utterances_doc] querying utterances for user_id: ${user_id}, session_id: ${session_id}, `
        + `count: ${count}`);
    var query_params = {
        TableName:                process.env.DYNAMODB_TABLE_USER_UTTERANCE,
        ProjectionExpression:     "createdAt, utterance_id, melvin_state, melvin_response, event_type",
        KeyConditionExpression:   "#user_id = :uid AND begins_with(#utterance_id, :sid)",
        FilterExpression:         "#event_type = :event_type",
        ExpressionAttributeNames: {
            "#user_id":      "user_id",
            "#utterance_id": "utterance_id",
            "#event_type":   "event_type"
        },
        ExpressionAttributeValues: {
            ":uid":        user_id,
            ":sid":        session_id,
            ":event_type": event_type
        },
        ScanIndexForward: true,
        Limit:            100
    };

    let utterance_list = await queryEntireTable(docClient, query_params, count);
    const utterance_len = utterance_list.length;
    console.info(`[utterances_doc] retrieved utterances list size: ${utterance_len}`);
    if (event_type === MelvinEventTypes.ANALYSIS_EVENT) {
        utterance_list = utterance_list
            .filter(item => Object.keys(item.melvin_state).length > FOLLOW_UP_TEXT_THRESHOLD);
    }
    return utterance_list.slice(0, Math.min(count, utterance_len));
};


utterances_doc.prototype.get_events_for_period = async function (
    user_id, session_id, duration, event_type, limit = 0) {
    let s_time = 0;
    if (duration != 0) {
        s_time = moment().valueOf() - (duration * 1000);
    }

    console.info(`[utterances_doc] querying utterance for user_id: ${user_id}, session_id: ${session_id}, `
        + `s_time: ${s_time}, limit: ${limit}`);
    var query_params = {
        TableName:                process.env.DYNAMODB_TABLE_USER_UTTERANCE,
        ProjectionExpression:     "createdAt, utterance_id, melvin_state, melvin_response, event_type",
        KeyConditionExpression:   "#user_id = :uid",
        FilterExpression:         "#event_type = :event_type AND #time > :s_time",
        ExpressionAttributeNames: {
            "#user_id":    "user_id",
            "#event_type": "event_type",
            "#time":       "createdAt"
        },
        ExpressionAttributeValues: {
            ":uid":        user_id,
            ":event_type": event_type,
            ":s_time":     s_time
        },
        ScanIndexForward: true,
        Limit:            100
    };

    let utterance_list = await queryEntireTable(docClient, query_params, limit);
    const utterance_len = utterance_list.length;
    console.info(`[utterances_doc] retrieved utterances list size: ${utterance_len}`);

    if (event_type === MelvinEventTypes.ANALYSIS_EVENT) {
        utterance_list = utterance_list
            .filter(item => Object.keys(item.melvin_state).length > FOLLOW_UP_TEXT_THRESHOLD);
    }
    utterance_list.sort(function (a, b) {
        return new Date(b["createdAt"]) - new Date(a["createdAt"]);
    });
    if (limit == 0) {
        return utterance_list;
    }
    return utterance_list.slice(0, Math.min(limit, utterance_len));
};

utterances_doc.prototype.getMostRecentUtterance = async function (user_id, session_id) {
    let utterance_list = [];

    console.log(`[utterances_doc] querying most recent utterance for user_id: ${user_id}, session_id: ${session_id}`);
    var query_params = {
        TableName:                process.env.DYNAMODB_TABLE_USER_UTTERANCE,
        ProjectionExpression:     "utterance_id, melvin_history, melvin_state",
        KeyConditionExpression:   "#user_id = :uid AND begins_with(#utterance_id, :sid)",
        ExpressionAttributeNames: {
            "#user_id":      "user_id",
            "#utterance_id": "utterance_id"
        },
        ExpressionAttributeValues: {
            ":uid": user_id,
            ":sid": session_id
        },
        ScanIndexForward: false,
        Limit:            1
    };

    // since there is no filter expression, we can query the table once with a limit of 1.
    utterance_list = await docClient.query(query_params).promise();
    console.info(`[utterances_doc] retrieved utterances list size: ${utterance_list.length}`);

    return utterance_list;
};

module.exports = new utterances_doc();