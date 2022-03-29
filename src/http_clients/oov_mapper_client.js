const AWS = require("aws-sdk");
const { sign_request } = require("../utils/sigv4_utils");
const fetch = require("@adobe/node-fetch-retry");
const allSettled = require("promise.allsettled");
const AbortController = require("abort-controller");
const https = require("https");
const { performance } = require("perf_hooks");

const {
    OOV_MAPPER_ENDPOINT,
    DEFAULT_OOV_MAPPING_ERROR_RESPONSE,
    OOV_PR_SPEECH,
    OOV_MAPPER_REGION,
    MelvinIntentErrors,
    melvin_error,
    delay_ms
} = require("../common.js");
const { build_melvin_voice_response } = require("../utils/response_builder_utils.js");
const { call_directive_service } = require("../utils/response_builder_utils.js");

const agent = new https.Agent({ maxSockets: 100 });
AWS.config.update({ httpOptions: { agent: agent }});

const OOV_DEFAULT_MAX_DURATION = 4000;
const OOV_DEFAULT_SOCKET_TIMEOUT = 1200;
const OOV_DEFAULT_INITIAL_DELAY = 200;
const OOV_PR_DELAY = 2000;

const send_request_async = function (url, headers) {
    console.info(`[oov_mapper_client] oov url: ${url.href}`);
    return fetch(url, {
        headers:      headers,
        retryOptions: {
            retryMaxDuration:  OOV_DEFAULT_MAX_DURATION,
            retryInitialDelay: OOV_DEFAULT_INITIAL_DELAY,
            retryBackoff:      1.0,
            socketTimeout:     OOV_DEFAULT_SOCKET_TIMEOUT,
            onRetry:           (error) => {
                console.error(`[oov_mapper_client] OOV request failed: ${JSON.stringify(error)}`);
            }
        }
    }).then(async (response) => {
        console.info(`[oov_mapper_client] OOV response status: ${response.status}`);
        if (response.ok) {
            return response.json();
        } else {
            throw await response.json();
        }
    }).catch((err) => {
        throw melvin_error(
            `[oov_mapper_client] OOV error: ${JSON.stringify(err)}`,
            MelvinIntentErrors.INVALID_API_RESPONSE,
            DEFAULT_OOV_MAPPING_ERROR_RESPONSE);
    });
};

const get_oov_mapping_by_query = async function (handlerInput, params) {
    const oov_url = new URL(`${OOV_MAPPER_ENDPOINT}/entity_mappings`);
    oov_url.searchParams.set("query", params.query);
    oov_url.searchParams.set("request_id", params.request_id);
    oov_url.searchParams.set("session_id", params.session_id);

    // Alexa progressive response to indicate that OOV mapper service is going to take little longer
    const controller_pr = new AbortController();
    const send_pr_req_async = async (resolve) => {
        await delay_ms(OOV_PR_DELAY);
        let res = null;
        if (!controller_pr.signal.aborted) {
            if (!process.env.IS_LOCAL) {
                const speech_ssml = build_melvin_voice_response(OOV_PR_SPEECH);
                res = await call_directive_service(handlerInput, speech_ssml)
                    .then(data => {
                        const reqAttributes = handlerInput.attributesManager.getRequestAttributes();
                        reqAttributes["OOV_PR_SENT"] = true;
                        handlerInput.attributesManager.setRequestAttributes(reqAttributes);
                        console.info(`[oov_mapper_client] progressive response sent | res: ${JSON.stringify(data)}`);
                    })
                    .catch(error => {
                        console.error("[oov_mapper_client] progressive response failed | "
                            + `error: ${JSON.stringify(error)}`);
                    });
            } else {
                console.info("[oov_mapper_client] skipping progressive response in local environment");
            }
        }
        resolve(res);
    };

    const pr_promise = new Promise(resolve => {
        controller_pr.signal.addEventListener("abort", () => {
            resolve("cancelled progressive response");
        });
        send_pr_req_async(resolve);
    });

    const signed_req = sign_request(oov_url, OOV_MAPPER_REGION, handlerInput);
    const oov_req_async = async () => {
        const response = await send_request_async(oov_url, signed_req.headers);
        controller_pr.abort();
        return response;
    };
    const t1 = performance.now();
    const results = await allSettled([pr_promise, oov_req_async()]);
    const t2 = performance.now();
    console.info(`[oov_mapper_client] OOV process took ${t2 - t1} ms, results: ${JSON.stringify(results)}`);
    if (results[1]["status"] === "fulfilled") {
        return results[1]["value"];
    } else {
        throw melvin_error(
            "[oov_mapper_client] OOV error: request unfulfilled",
            MelvinIntentErrors.INVALID_API_RESPONSE,
            DEFAULT_OOV_MAPPING_ERROR_RESPONSE);
    }
};

module.exports = { get_oov_mapping_by_query };
