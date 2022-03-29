const AWS = require("aws-sdk");
const aws4 = require("aws4");

const {
    DEFAULT_GENERIC_ERROR_SPEECH_TEXT,
    MelvinIntentErrors,
    melvin_error
} = require("../common.js");

async function assume_role(role_arn, role_session) {
    var sts = new AWS.STS();
    try {
        const data = await sts.assumeRole({
            RoleArn:         role_arn,
            RoleSessionName: role_session
        }).promise();
        console.debug(`[sigv4_utils] Assumed role: ${role_arn} for session: ${role_session} `);
        return data;
    } catch (err) {
        console.error(`[sigv4_utils] Failed to assume role: ${role_arn} for session: ${role_session} `);
        throw err;
    }
}


function get_creds_data(creds_provider) {
    if (creds_provider.attributesManager) {
        const sessionAttributes = creds_provider.attributesManager.getSessionAttributes();
        if (sessionAttributes["MELVIN.STS.CREDENTIALS"]) {
            return sessionAttributes["MELVIN.STS.CREDENTIALS"];
        }
    }
    return creds_provider;
}


function sign_request(url, region, creds_provider, presigned = false, method = "GET", expiry_timeout=43200) {
    if (presigned) {
        url.searchParams.set("X-Amz-Expires", expiry_timeout);
    }
    const cred_data = get_creds_data(creds_provider);
    if (cred_data.Credentials) {
        const path = url.pathname + url.search;
        // console.debug(`[sigv4_utils] signing request method: ${method}, path: ${path}`);

        const opts = {
            host: url.host, path: path, service: "execute-api", region: region, signQuery: presigned 
        };
        const signed_req = aws4.sign(opts, {
            accessKeyId:     cred_data.Credentials.AccessKeyId,
            secretAccessKey: cred_data.Credentials.SecretAccessKey,
            sessionToken:    cred_data.Credentials.SessionToken
        });
        return signed_req;
    } else {
        throw melvin_error(
            "[sigv4_utils] credentials missing", MelvinIntentErrors.AUTH_ERROR, DEFAULT_GENERIC_ERROR_SPEECH_TEXT);
    }
}

function build_presigned_url(signed_req) {
    return "https://" + signed_req.host + signed_req.path;
}

module.exports = {
    sign_request, assume_role, build_presigned_url
};