const _ = require("lodash");
const moment = require("moment");
const {
    STSClient, AssumeRoleCommand
} = require("@aws-sdk/client-sts");
const { HttpRequest } = require("@aws-sdk/protocol-http");
const { SignatureV4 } = require("@aws-sdk/signature-v4");
const { Sha256 } = require("@aws-crypto/sha256-browser");

const {
    DEFAULT_GENERIC_ERROR_SPEECH_TEXT,
    MelvinIntentErrors,
    melvin_error
} = require("../common.js");


const X_AMZ_EXPIRES = "X-Amz-Expires";
const X_AMZ_SIGNED_HEADERS = "X-Amz-SignedHeaders";

async function assume_role(role_arn, role_session) {
    const client = new STSClient({ region: process.env.REGION });
    const command = new AssumeRoleCommand({
        RoleArn:         role_arn,
        RoleSessionName: role_session
    });
    try {
        const data = await client.send(command);
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

function paramsToObject(entries) {
    const result = {};
    for (const [key, value] of entries) {
        result[key] = value;
    }
    return result;
}


async function sign_request(url, region, creds_provider, presigned = false, method = "GET", expiry_timeout = 43200) {
    const cred_data = get_creds_data(creds_provider);
    if (cred_data.Credentials) {
        const creds = {
            accessKeyId:     cred_data.Credentials.AccessKeyId,
            secretAccessKey: cred_data.Credentials.SecretAccessKey,
            sessionToken:    cred_data.Credentials.SessionToken
        };
        const signer = new SignatureV4({
            credentials: creds,
            region:      region,
            service:     "execute-api",
            sha256:      Sha256
        });
        const headers = {
            "host":          url.host,
            [X_AMZ_EXPIRES]: String(expiry_timeout)
        };
        const request = new HttpRequest({
            headers:  headers,
            hostname: url.host,
            method:   method,
            path:     url.pathname,
            query:    paramsToObject(url.searchParams.entries())
        });
        let signed_req = {};
        if (presigned) {
            signed_req = await signer.presign(request, { expiresIn: expiry_timeout });
        } else {
            signed_req = await signer.sign(request);
        }
        return signed_req;
    } else {
        throw melvin_error(
            "[sigv4_utils] credentials missing", MelvinIntentErrors.AUTH_ERROR, DEFAULT_GENERIC_ERROR_SPEECH_TEXT);
    }
}

async function sign_request_with_creds(url, region, cred_data, presigned = false, method = "GET", 
    expiry_timeout = 43200) {
    if (cred_data.Credentials) {
        const creds = {
            accessKeyId:     cred_data.Credentials.AccessKeyId,
            secretAccessKey: cred_data.Credentials.SecretAccessKey,
            sessionToken:    cred_data.Credentials.SessionToken
        };
        const signer = new SignatureV4({
            credentials: creds,
            region:      region,
            service:     "execute-api",
            sha256:      Sha256
        });
        const headers = {
            "host":          url.host,
            [X_AMZ_EXPIRES]: String(expiry_timeout)
        };
        const request = new HttpRequest({
            headers:  headers,
            hostname: url.host,
            method:   method,
            path:     url.pathname,
            query:    paramsToObject(url.searchParams.entries())
        });
        let signed_req = {};
        if (presigned) {
            signed_req = await signer.presign(request, { expiresIn: expiry_timeout });
        } else {
            signed_req = await signer.sign(request);
        }
        return signed_req;
    } else {
        throw melvin_error(
            "[sigv4_utils] credentials missing", MelvinIntentErrors.AUTH_ERROR, DEFAULT_GENERIC_ERROR_SPEECH_TEXT);
    }
}

function build_presigned_url(signed_req) {
    const url = new URL(signed_req.protocol + signed_req.hostname + signed_req.path);
    for (const [key, value] of Object.entries(signed_req.query)) {
        url.searchParams.set(key, value);
    }

    const signed_headers = [];
    for (let key in signed_req.headers) {
        signed_headers.push(key);
    }
    url.searchParams.set(X_AMZ_SIGNED_HEADERS, signed_headers.join(","));
    return url.href;
}

function has_creds_expired(credentials) {
    const exp = _.get(credentials, "Credentials.Expiration");
    if (_.isNil(exp)) {
        console.warn("[sigv4_utils] credentials expiration missing");
        return true;
    }

    const diff = moment.utc().diff(moment(exp), "seconds");
    const delta = 300;
    if (diff + delta >= 0) {
        console.debug(`[sigv4_utils] credentials expired at ${exp}`);
        return true;
    }
    return false;
}


module.exports = {
    sign_request, sign_request_with_creds, assume_role, build_presigned_url, has_creds_expired
};