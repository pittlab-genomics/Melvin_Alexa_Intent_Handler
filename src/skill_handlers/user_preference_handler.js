const _ = require("lodash");

const {
    get_user_preference_name,
    MelvinIntentErrors,
    PREFERENCES_PROF_INFO_ERROR_RESPONSE,
    PREFERENCES_PERMISSION_ERROR,
    PREFERENCES_ERROR_REPROMPT,
    PREFERENCES_UPDATE_SUCCESS,
    melvin_error
} = require("../common");

const { build_melvin_voice_response } = require("../utils/response_builder_utils.js");

const { get_profile_info } = require("../http_clients/profile_client");
const { add_to_APL_text_pager } = require("../utils/APL_utils.js");

const EnableUserPreferenceIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "EnableUserPreferenceIntent";
    },
    async handle(handlerInput) {
        const access_token = _.get(handlerInput, "requestEnvelope.context.System.user.accessToken");
        let speech_text = "";
        let reprompt_text = "";

        if (_.isNil(access_token)) {
            speech_text = build_melvin_voice_response(PREFERENCES_PERMISSION_ERROR);
            reprompt_text = build_melvin_voice_response(PREFERENCES_PERMISSION_ERROR);
            return handlerInput.responseBuilder
                .speak(speech_text)
                .reprompt(reprompt_text)
                .withLinkAccountCard()
                .withShouldEndSession(false)
                .getResponse();
        }

        try {
            const response = await update_preference_flag(handlerInput, access_token, true);
            speech_text = build_melvin_voice_response(response["speech_text"]);
            reprompt_text = build_melvin_voice_response(response["reprompt_text"]);
        } catch (error) {
            speech_text = build_melvin_voice_response(_.get(error, "speech", PREFERENCES_PROF_INFO_ERROR_RESPONSE));
            reprompt_text = build_melvin_voice_response(PREFERENCES_ERROR_REPROMPT);
            add_to_APL_text_pager(handlerInput, "");
            console.error("[EnableUserPreferenceIntentHandler] Error! except: ", error);
        }

        return handlerInput.responseBuilder
            .speak(speech_text)
            .reprompt(reprompt_text)
            .withShouldEndSession(false)
            .getResponse();
    }
};

const DisableUserPreferenceIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "DisableUserPreferenceIntent";
    },
    async handle(handlerInput) {
        const access_token = _.get(handlerInput, "requestEnvelope.context.System.user.accessToken");
        let speech_text = "";
        let reprompt_text = "";

        if (_.isNil(access_token)) {
            speech_text = build_melvin_voice_response(PREFERENCES_PERMISSION_ERROR);
            reprompt_text = build_melvin_voice_response(PREFERENCES_PERMISSION_ERROR);
            return handlerInput.responseBuilder
                .speak(speech_text)
                .reprompt(reprompt_text)
                .withLinkAccountCard()
                .withShouldEndSession(false)
                .getResponse();
        }

        try {
            const response = await update_preference_flag(handlerInput, access_token, false);
            speech_text = build_melvin_voice_response(response["speech_text"]);
            reprompt_text = build_melvin_voice_response(response["reprompt_text"]);
        } catch (error) {
            speech_text = build_melvin_voice_response(_.get(error, "speech", PREFERENCES_PROF_INFO_ERROR_RESPONSE));
            reprompt_text = build_melvin_voice_response(PREFERENCES_ERROR_REPROMPT);
            add_to_APL_text_pager(handlerInput, "");
            console.error(`[DisableUserPreferenceIntentHandler] error: ${error.message}`, error);
        }
        return handlerInput.responseBuilder
            .speak(speech_text)
            .reprompt(reprompt_text)
            .withShouldEndSession(false)
            .getResponse();

    }
};

const update_preference_flag = async (handlerInput, access_token, flag) => {
    if (_.isNil(access_token) || _.isNil(flag)) {
        throw melvin_error(
            "[user_preference_handler] invalid arguments",
            MelvinIntentErrors.INVALID_ARGUMENTS,
            PREFERENCES_PROF_INFO_ERROR_RESPONSE);
    }
    const preference_name = get_user_preference_name(
        _.get(handlerInput, "requestEnvelope.request.intent.slots.preference.value"));
    const user_info = await get_profile_info(access_token);
    const new_preferences = {
        [preference_name]: flag,
        "user_id":         user_info["user_id"],
        "email":           user_info["email"]
    };

    const attributesManager = handlerInput.attributesManager;
    const curr_preferences = attributesManager.getPersistentAttributes();
    attributesManager.setPersistentAttributes({
        ...curr_preferences, ...new_preferences
    });
    console.info(`[user_preference_handler] preference_name: ${preference_name}, ` +
        `curr_preferences: ${JSON.stringify(curr_preferences)}, user_info: ${JSON.stringify(user_info)}`);
    await attributesManager.savePersistentAttributes();
    return {
        "speech_text":   PREFERENCES_UPDATE_SUCCESS,
        "reprompt_text": PREFERENCES_UPDATE_SUCCESS
    };
};

module.exports = {
    EnableUserPreferenceIntentHandler,
    DisableUserPreferenceIntentHandler
};