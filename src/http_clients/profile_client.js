const fetch = require("@adobe/node-fetch-retry");

const {
    PROFILE_INFO_ENDPOINT,
    PREFERENCES_PROF_INFO_API_ERROR_RESPONSE,
    MelvinIntentErrors,
    melvin_error
} = require("../common.js");

const PREF_DEFAULT_MAX_DURATION = 3000;
const PREF_DEFAULT_INITIAL_DELAY = 500;
const PREF_DEFAULT_SOCKET_TIMEOUT = 1200;

async function get_profile_info(access_token) {
    const profile_url = new URL(PROFILE_INFO_ENDPOINT);
    console.info(`[profile_client] profile info url: ${profile_url.href}`);
    return fetch(PROFILE_INFO_ENDPOINT, {
        headers:      { "Authorization": `Bearer ${access_token}` },
        retryOptions: {
            retryMaxDuration:  PREF_DEFAULT_MAX_DURATION,
            retryInitialDelay: PREF_DEFAULT_INITIAL_DELAY,
            retryBackoff:      1.0,
            socketTimeout:     PREF_DEFAULT_SOCKET_TIMEOUT,
            onRetry:           (error) => {
                console.error(`[profile_client] profile info request failed: ${JSON.stringify(error)}`);
            }
        }
    }).then(async (response) => {
        console.info(`[profile_client] profile info response status: ${response.status}`);
        if (response.ok) {
            return response.json();
        } else {
            throw await response.json();
        }
    }).catch((err) => {
        throw melvin_error(
            `[profile_client] profile info error: ${JSON.stringify(err)}`,
            MelvinIntentErrors.INVALID_API_RESPONSE,
            PREFERENCES_PROF_INFO_API_ERROR_RESPONSE);
    });
}

module.exports = { get_profile_info };