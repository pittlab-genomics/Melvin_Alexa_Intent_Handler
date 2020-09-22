const Speech = require("ssml-builder");
const _ = require("lodash");
const URL = require("url").URL;

const { get_clinical_trials } = require("../http_clients/melvin_explorer_client.js");
const { add_to_APL_image_pager } = require("../utils/APL_utils.js");
const { add_query_list_params } = require("../utils/response_builder_utils.js");
const { get_melvin_state } = require("../utils/navigation_utils.js",);

const {
    MelvinAttributes,
    get_study_name_text,
    MELVIN_EXPLORER_ENDPOINT,
    MelvinExplorerErrors,
    DEFAULT_GENERIC_ERROR_SPEECH_TEXT
} = require("../common.js");

function build_clinical_trials_error_speech(params, response, speech) {
    if (response["error"] && response["error"] === MelvinExplorerErrors.UNIDENTIFIED_STUDY) {
        speech.say("Sorry, I could not find that cancer type.");

    } else if (response["error"] && response["error"] === MelvinExplorerErrors.UNIDENTIFIED_LOCATION) {
        speech.say(`Sorry, I could not find a place called ${params["location"]}`);

    } else if (response["error"] && response["error"] === MelvinExplorerErrors.NO_TRIAL_IN_VICINITY) {
        speech.say(`Sorry, I could not find any clinical trials in ${location}.`);

    } else {
        speech.say("Sorry, there was a problem while fetching the data. Please try again.");
    }
}

function add_clinical_trials_map_plot(handlerInput, params) {
    let image_list = [];
    const clinical_trial_map_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/clinical_trials/map_plot`);
    add_query_list_params(clinical_trial_map_url, params, ["location", "distance", "study"]);
    image_list.push(clinical_trial_map_url);
    add_to_APL_image_pager(handlerInput, image_list);
}

const ClinicalTrialsNearbyIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "ClinicalTrialsNearby";
    },
    async handle(handlerInput) {
        let speechText = "";
        const speech = new Speech();
        let location = _.get(handlerInput, "requestEnvelope.request.intent.slots.location_query.value");
        if (_.isNil(location)) {
            location = "Singapore";
        }
        let params = { location };

        const melvin_state = get_melvin_state(handlerInput);
        if (!_.isNil(melvin_state[MelvinAttributes.STUDY_ABBRV])) {
            params["study"] = melvin_state[MelvinAttributes.STUDY_ABBRV];
        }

        try {
            const response = await get_clinical_trials(handlerInput, params);
            if (response["data"] && Array.isArray(response["data"])) {
                const record_count = response["data"].length;
                if (record_count > 0) {
                    if (params["study"]) {
                        const study = get_study_name_text(melvin_state[MelvinAttributes.STUDY_ABBRV]);
                        speech.say(`There are ${record_count} clinical trials near` +
                            ` ${location} for ${study}.`);
                    } else {
                        speech.say(`There are ${record_count} clinical trials near ${location}.`);
                    }
                    speech.say(`The closest one is at ${response["data"][0]["facility_name"]}`);
                    add_clinical_trials_map_plot(handlerInput, params);

                } else {
                    speech.say("Sorry, I could not find any clinical trials matching your description.");
                }

            } else {
                build_clinical_trials_error_speech(params, response, speech);
            }
            speechText = speech.ssml();

        } catch (error) {
            if (error["speech"]) {
                speechText = error["speech"];
            } else {
                speechText = DEFAULT_GENERIC_ERROR_SPEECH_TEXT;
            }
            console.error("Error in ClinicalTrialsNearbyIntentHandler", error);
        }

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};


const ClinicalTrialsWithinIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "ClinicalTrialsWithin";
    },
    async handle(handlerInput) {
        let speechText = "";
        const speech = new Speech();
        let location = _.get(handlerInput, "requestEnvelope.request.intent.slots.location.value");
        if (_.isNil(location) || location.toLowerCase() === "me") {
            location = "Singapore";
        }
        let params = { location };

        let distance = _.get(handlerInput, "requestEnvelope.request.intent.slots.distance.value");
        if (_.isNil(distance)) {
            distance = 50; // defaults to 50km
        }
        params["distance"] = distance;

        const melvin_state = get_melvin_state(handlerInput);
        if (!_.isNil(melvin_state[MelvinAttributes.STUDY_ABBRV])) {
            params["study"] = melvin_state[MelvinAttributes.STUDY_ABBRV];
        }

        try {
            const response = await get_clinical_trials(handlerInput, params);
            if (response["data"] && Array.isArray(response["data"])) {
                const record_count = response["data"].length;
                if (record_count > 0) {
                    if (params["study"]) {
                        const study = get_study_name_text(melvin_state[MelvinAttributes.STUDY_ABBRV]);
                        speech.say(`There are ${record_count} clinical trials within ${params["distance"]}` +
                            ` kilometres of ${location} for ${study}.`);
                    } else {
                        speech.say(`There are ${record_count} clinical trials within ${params["distance"]}` +
                            ` kilometres of ${location}.`);
                    }
                    speech.say(`The closest one is at ${response["data"][0]["facility_name"]}`);
                    add_clinical_trials_map_plot(handlerInput, params);

                } else {
                    speech.say("Sorry, I could not find any clinical trials matching your description.");
                }

            } else {
                build_clinical_trials_error_speech(params, response, speech);
            }
            speechText = speech.ssml();

        } catch (error) {
            if (error["speech"]) {
                speechText = error["speech"];
            } else {
                speechText = DEFAULT_GENERIC_ERROR_SPEECH_TEXT;
            }
            console.error("Error in ClinicalTrialsWithinIntentHandler", error);
        }

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};


const ClinicalTrialClosestIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "ClinicalTrialClosest";
    },
    async handle(handlerInput) {
        let speechText = "";
        const speech = new Speech();
        let location = "Singapore";
        let params = { location };

        const melvin_state = get_melvin_state(handlerInput);
        if (!_.isNil(melvin_state[MelvinAttributes.STUDY_ABBRV])) {
            params["study"] = melvin_state[MelvinAttributes.STUDY_ABBRV];
        }

        try {
            const response = await get_clinical_trials(handlerInput, params);
            if (response["data"] && Array.isArray(response["data"])) {
                const record_count = response["data"].length;
                if (record_count > 0) {
                    const trial_item = response["data"][0];
                    speech.say(`The closest clinical trial is at ${trial_item["facility_name"]}`);

                    if (!_.isNil(trial_item["city"]) && trial_item["city"] !== "None") {
                        speech.say(`located in ${trial_item["city"]}`);

                        if (!_.isNil(trial_item["state"]) && trial_item["state"] !== "None") {
                            speech.say(`, ${trial_item["state"]}`);
                        }
                        if (trial_item["country"] !== trial_item["city"]
                            && !_.isNil(trial_item["country"]) && trial_item["country"] !== "None") {
                            speech.say(`, ${trial_item["country"]}`);
                        }
                    }
                    add_clinical_trials_map_plot(handlerInput, params);

                } else {
                    speech.say("Sorry, I could not find any clinical trials matching your description.");
                }

            } else {
                build_clinical_trials_error_speech(params, response, speech);
            }
            speechText = speech.ssml();

        } catch (error) {
            if (error["speech"]) {
                speechText = error["speech"];
            } else {
                speechText = DEFAULT_GENERIC_ERROR_SPEECH_TEXT;
            }
            console.error("Error in ClinicalTrialClosestIntentHandler", error);
        }

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};

module.exports = {
    ClinicalTrialsNearbyIntentHandler,
    ClinicalTrialsWithinIntentHandler,
    ClinicalTrialClosestIntentHandler
};