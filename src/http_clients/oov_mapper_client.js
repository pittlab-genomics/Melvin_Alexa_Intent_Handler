"use strict";

const AWS = require("aws-sdk");
const sigv4_utils = require("../utils/sigv4_utils");
const fetch = require("node-fetch");
const AbortController = require("abort-controller");
const https = require("https");

const {
    OOV_MAPPER_ENDPOINT,
    DEFAULT_OOV_MAPPING_ERROR_RESPONSE,
    DEFAULT_OOV_CONNECT_ERROR_RESPONSE,
    OOV_MAPPER_ROLE,
    OOV_MAPPER_REGION,
    MelvinIntentErrors,
    melvin_error
} = require("../common.js");

const agent = new https.Agent({ maxSockets: 100 });
AWS.config.update({ httpOptions: { agent: agent }});

const oov_timeout = 2000;

const send_request_async = function(url, timeout, headers) {
    const controller = new AbortController();
    const signal = controller.signal;
    setTimeout(() => { 
        controller.abort();
    }, timeout, headers);

    console.info(`[send_request_async] oov url: ${url.href}`);
    return fetch(url, {
        signal, agent 
    }).then((response) => {
        if (response.ok) {
            return response.json();
        } else {
            throw melvin_error(
                `[send_request_async] oov response not ok | ${JSON.stringify(response)}`,
                MelvinIntentErrors.INVALID_API_RESPONSE,
                DEFAULT_OOV_MAPPING_ERROR_RESPONSE);
        }
    }).catch((err) => {
        throw melvin_error(
            `[send_request_async] oov connect error: ${JSON.stringify(err)}`,
            MelvinIntentErrors.INVALID_API_RESPONSE,
            DEFAULT_OOV_CONNECT_ERROR_RESPONSE);
    });
};

const get_oov_mapping_by_query = async function(params) {
    const oov_url = new URL(`${OOV_MAPPER_ENDPOINT}`);
    oov_url.searchParams.set("query", params.query);
    oov_url.searchParams.set("request_id", params.request_id);
    oov_url.searchParams.set("session_id", params.session_id);

    const path = "/" + oov_url.search;
    var signedRequest = await signUrl(path);
    return await send_request_async(oov_url, oov_timeout, signedRequest.headers);
};

async function assumeRole() {
    var sts = new AWS.STS();
    try {
        const data = await sts.assumeRole({
            RoleArn:         OOV_MAPPER_ROLE,
            RoleSessionName: "oov_mapper_invoke"
        }).promise();
        console.log("[assumeRole] Assumed role success.");
        return data;
    } catch (err) {
        console.log("[assumeRole] Cannot assume role.");
        console.log(err, err.stack);
    }
}

async function signUrl(path, queryParams = {}, method="GET", headers={}) {
    const data = await assumeRole();
    const signedRequest = sigv4_utils.sigV4Client.newClient({
        accessKey:    data.Credentials.AccessKeyId,
        secretKey:    data.Credentials.SecretAccessKey,
        sessionToken: data.Credentials.SessionToken,
        region:       OOV_MAPPER_REGION,
        endpoint:     OOV_MAPPER_ENDPOINT
    }).signRequest({
        method, path, headers, queryParams
    });
    return signedRequest;

}

module.exports = { get_oov_mapping_by_query };
