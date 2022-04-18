const AWS = require("aws-sdk");

const { queryEntireTable } = require("./dao_utils.js");


AWS.config.update({ region: "ap-southeast-1" });
const docClient = new AWS.DynamoDB.DocumentClient();
const voicerecords_doc = function () { };

voicerecords_doc.prototype.getOOVMappingForQuery = async (query, user_email) => {
    console.log(`[voicerecords] querying custom recordings for query: ${query}`);
    var query_params = {
        TableName:                process.env.DYNAMODB_TABLE_VOICE_RECORDER,
        ProjectionExpression:     "entity_data",
        KeyConditionExpression:   "#user_id = :uid",
        FilterExpression:         "#query = :utterance",
        ExpressionAttributeNames: {
            "#query":   "query",
            "#user_id": "user_id", 
        },
        ExpressionAttributeValues: {
            ":utterance": query,
            ":uid":       user_email 
        },
        ScanIndexForward: false,
        Limit:            100
    };

    const response = await queryEntireTable(docClient, query_params, 1);
    console.info(`[voicerecords] recordings list size: ${response.length}`);
    return response;
};

module.exports = new voicerecords_doc();