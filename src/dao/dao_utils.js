

const queryEntireTable = async function (docClient, query_params, limit = 0) {
    console.debug(`[dao_utils] Querying entire table with params: ${JSON.stringify(query_params)}, limit: ${limit}`);
    let result = [];
    let hasMorePages = true;
    do {
        let data = await docClient.query(query_params).promise();

        if (data["Items"].length > 0) {
            result = [...result, ...data["Items"]];
        }

        if (data.LastEvaluatedKey) {
            hasMorePages = true;
            query_params.ExclusiveStartKey = data.LastEvaluatedKey;
        } else {
            hasMorePages = false;
        }
        if (hasMorePages && limit != 0 && result.length >= limit) {
            hasMorePages = false;
        }
    } while (hasMorePages);
    return result;
};

const scanEntireTable = async function (docClient, scan_params, limit = 0) {
    console.debug(`[dao_utils] Scanning entire table with params: ${JSON.stringify(scan_params)}, limit: ${limit}`);
    let result = [];
    let hasMorePages = true;
    do {
        let data = await docClient.scan(scan_params).promise();

        if (data["Items"].length > 0) {
            result = [...result, ...data["Items"]];
        }

        if (data.LastEvaluatedKey) {
            hasMorePages = true;
            scan_params.ExclusiveStartKey = data.LastEvaluatedKey;
        } else {
            hasMorePages = false;
        }
        if (hasMorePages && limit != 0 && result.length >= limit) {
            hasMorePages = false;
        }
    } while (hasMorePages);
    return result;
};

module.exports = {
    queryEntireTable,
    scanEntireTable
};