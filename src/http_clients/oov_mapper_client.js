"use strict";

const AWS = require("aws-sdk");
const fetch = require("node-fetch");
const AbortController = require("abort-controller");
const https = require("https");
const URL = require("url").URL;

const {
    OOV_MAPPER_ENDPOINT,
    MelvinIntentErrors,
    melvin_error
} = require("../common.js");

const agent = new https.Agent({ maxSockets: 100 });
AWS.config.update({ httpOptions: { agent: agent }});

const controller_short = new AbortController();
const signal_short = controller_short.signal;
setTimeout(() => { 
    controller_short.abort();
}, 2500);


const send_request_async = function(url, signal) {
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
                "Sorry, I'm having trouble mapping the query utterance. Please try again later.");
        }
    }).catch((err) => {
        throw melvin_error(
            `[send_request_async] oov err: ${JSON.stringify(err)}`,
            MelvinIntentErrors.INVALID_API_RESPOSE,
            "Sorry, I'm having trouble connecting to the mapper service. Please try again later.");
    });
};

const get_oov_mapping_by_query = async function(params) {
    const oov_url = new URL(`${OOV_MAPPER_ENDPOINT}/entity_mappings`);
    oov_url.searchParams.set("query", params.query);
    oov_url.searchParams.set("request_id", params.request_id);
    oov_url.searchParams.set("session_id", params.session_id);

    return await send_request_async(oov_url, signal_short);
};

module.exports = { get_oov_mapping_by_query };
