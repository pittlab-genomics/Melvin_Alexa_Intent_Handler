"use strict";

const AWS = require("aws-sdk");
const fetch = require("node-fetch");
const AbortController = require("abort-controller");
const https = require("https");

const {
    OOV_MAPPER_ENDPOINT,
    DEFAULT_OOV_MAPPING_ERROR_RESPONSE,
    DEFAULT_OOV_CONNECT_ERROR_RESPONSE,
    MelvinIntentErrors,
    melvin_error
} = require("../common.js");

const agent = new https.Agent({ maxSockets: 100 });
AWS.config.update({ httpOptions: { agent: agent }});

const oov_timeout = 2000;

const send_request_async = function(url, timeout) {
    const controller = new AbortController();
    const signal = controller.signal;
    setTimeout(() => { 
        controller.abort();
    }, timeout);

    console.info(`[send_request_async] oov url: ${url.href}`);
    return fetch(url, {
        signal, agent 
    }).then((response) => {
        if (response.ok) {
            return response.json();
        } else {
            throw melvin_error(
                `[send_request_async] oov response not ok | ${JSON.stringify(response)}`,
                MelvinIntentErrors.INVALID_API_RESPOSE,
                DEFAULT_OOV_MAPPING_ERROR_RESPONSE);
        }
    }).catch((err) => {
        throw melvin_error(
            `[send_request_async] oov connect error: ${JSON.stringify(err)}`,
            MelvinIntentErrors.INVALID_API_RESPOSE,
            DEFAULT_OOV_CONNECT_ERROR_RESPONSE);
    });
};

const get_oov_mapping_by_query = async function(params) {
    const oov_url = new URL(`${OOV_MAPPER_ENDPOINT}/entity_mappings`);
    oov_url.searchParams.set("query", params.query);
    oov_url.searchParams.set("request_id", params.request_id);
    oov_url.searchParams.set("session_id", params.session_id);

    return await send_request_async(oov_url, oov_timeout);
};

module.exports = { get_oov_mapping_by_query };
