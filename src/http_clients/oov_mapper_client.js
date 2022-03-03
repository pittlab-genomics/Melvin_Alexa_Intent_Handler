const AWS = require("aws-sdk");
const { sign_request } = require("../utils/sigv4_utils");
const fetch = require("node-fetch");
const AbortController = require("abort-controller");
const https = require("https");
const { performance } = require("perf_hooks");

const {
    OOV_MAPPER_ENDPOINT,
    DEFAULT_OOV_MAPPING_ERROR_RESPONSE,
    OOV_MAPPER_REGION,
    MelvinIntentErrors,
    melvin_error
} = require("../common.js");

const agent = new https.Agent({ maxSockets: 100 });
AWS.config.update({ httpOptions: { agent: agent }});
const oov_timeout = 7000;

const send_request_async = function (url, timeout, headers) {
    const controller = new AbortController();
    const signal = controller.signal;
    setTimeout(() => {
        controller.abort();
    }, timeout);

    console.info(`[send_request_async] oov url: ${url.href}`);
    const t1 = performance.now();
    return fetch(url, {
        headers, signal, agent
    }).then(async (response) => {
        const t2 = performance.now();
        console.info(`[send_request_async] OOV request took ${(t2 - t1)} ms | response status: ${response.status}`);
        if (response.ok) {
            return response.json();
        } else {
            throw await response.json();
        }
    }).catch((err) => {
        throw melvin_error(
            `[send_request_async] OOV error: ${JSON.stringify(err)}`,
            MelvinIntentErrors.INVALID_API_RESPONSE,
            DEFAULT_OOV_MAPPING_ERROR_RESPONSE);
    });
};

const get_oov_mapping_by_query = async function (handlerInput, params) {
    const oov_url = new URL(`${OOV_MAPPER_ENDPOINT}/entity_mappings`);
    oov_url.searchParams.set("query", params.query);
    oov_url.searchParams.set("request_id", params.request_id);
    oov_url.searchParams.set("session_id", params.session_id);

    const signed_req = sign_request(oov_url, OOV_MAPPER_REGION, handlerInput);
    return await send_request_async(oov_url, oov_timeout, signed_req.headers);
};

module.exports = { get_oov_mapping_by_query };
