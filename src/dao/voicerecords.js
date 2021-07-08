var AWS = require("aws-sdk");

AWS.config.update({ region: "ap-southeast-1" });
var docClient = new AWS.DynamoDB.DocumentClient();
const { scanEntireTable } = require("./dao_utils.js");

var voicerecords_doc = function () { };

voicerecords_doc.prototype.getOOVMappingForQuery = async (query) => {
    console.log(`[getOOVMappingForQuery] querying custom recordings for : ${query}`);
    var query_params = {
        TableName:                 process.env.DYNAMODB_TABLE_VOICE_RECORDER,
        ProjectionExpression:      "entity_data",
        FilterExpression:          "#query = :utterance",
        ExpressionAttributeNames:  { "#query": "query" },
        ExpressionAttributeValues: { ":utterance": query },
        ScanIndexForward:          false,
        Limit:                     1
    };

    const response = await scanEntireTable(docClient, query_params);
    console.info(`[getOOVMappingForQuery] response: ${JSON.stringify(response)}`);
    if(response.length == 0) {
        return null;
    } else { 
        return response; 
    }
};

module.exports = new voicerecords_doc();