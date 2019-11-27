const Speech = require('ssml-builder');
const _ = require('lodash');
const URL = require('url').URL;

const { get_clinical_trials } = require('../http_clients/clinical_trials_client.js');
const { add_to_APL_image_pager } = require('../utils/APL_utils.js');
const { add_query_list_params } = require('../utils/response_builder_utils.js');

const {
    MELVIN_EXPLORER_ENDPOINT,
    MelvinExplorerErrors,
    DEFAULT_ERROR_SPEECH_TEXT
} = require('../common.js');

const ClinicalTrialsNearbyIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'ClinicalTrialsNearby';
    },
    async handle(handlerInput) {
        let speechText = '';
        let speech = new Speech();
        let location = _.get(handlerInput, 'requestEnvelope.request.intent.slots.location_query.value');
        if (_.isNil(location)) {
            location = _.get(handlerInput, 'requestEnvelope.request.intent.slots.location_custom.value');
            if (_.isNil(location)) {
                location = 'Singapore';
            }
        }
        let params = { location };

        let distance = _.get(handlerInput, 'requestEnvelope.request.intent.slots.distance.value');
        if (_.isNil(distance)) {
            distance = 50;
        }
        params['distance'] = distance

        try {
            const response = await get_clinical_trials(params);
            if (response['data'] && Array.isArray(response['data'])) {
                if (response['data'].length > 0) {
                    speech.say(`There are ${response['data'].length} clinical trials near ${location}.`);
                    speech.say(`The closest one is at ${response['data'][0]['facility_name']}`);

                    let image_list = [];
                    const clinical_trial_map_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/clinical_trials/map_plot`);
                    add_query_list_params(clinical_trial_map_url, params, ['location', 'distance', 'study']);
                    image_list.push(clinical_trial_map_url);
                    add_to_APL_image_pager(handlerInput, image_list);

                } else {
                    speech.say(`Sorry, I could not find any clinical trials matching your description.`);
                }
                speechText = speech.ssml();

            } else if (response['error'] && response['error'] === MelvinExplorerErrors.UNIDENTIFIED_STUDY) {
                speech.say(`Sorry, I could not find a cancer type named `);
                speechText = speech.ssml();

            } else if (response['error'] && response['error'] === MelvinExplorerErrors.UNIDENTIFIED_LOCATION) {
                speech.say(`Sorry, I could not find a place called ${location}`);
                speechText = speech.ssml();

            } else if (response['error'] && response['error'] === MelvinExplorerErrors.NO_TRIAL_IN_VICINITY) {
                speech.say(`Sorry, I could not find any clinical trials in ${location}.`);
                speechText = speech.ssml();

            } else {
                speech.say(`Sorry, there was a problem while fetching the data. Please try again.`);
                speechText = speech.ssml();
            }

        } catch (error) {
            if (error['speech']) {
                speechText = error['speech'];
            } else {
                speechText = DEFAULT_ERROR_SPEECH_TEXT;
            }
            console.error(`Error in ClinicalTrialsNearbyIntentHandler`, error);
        }

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};

module.exports = {
    ClinicalTrialsNearbyIntentHandler
}