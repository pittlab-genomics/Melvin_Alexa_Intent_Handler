

const queryEntireTable = async function (docClient, query_params) {
    console.debug("Querying entire table with params: ", query_params);
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
    } while (hasMorePages);
    return result;
};

const scanEntireTable = async function (docClient, scan_params) {
    console.debug("Scanning entire table with params: ", scan_params);
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
    } while (hasMorePages);
    return result;
};

module.exports = {
    queryEntireTable,
    scanEntireTable
};