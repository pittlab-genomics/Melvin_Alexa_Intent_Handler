const _ = require("lodash");

const {
    MelvinEventTypes,
    MELVIN_WELCOME_GREETING,
    MELVIN_APP_NAME,
    DEFAULT_GENERIC_ERROR_SPEECH_TEXT,
    DEFAULT_ERROR_REPROMPT,
    RESTORE_SESSION_NO_PREV,
    RESTORE_SESSION_NO_ANALYSIS,
    RESTORE_SESSION_SUCCESS,
    RESTORE_SESSION_SUCCESS_REPROMPT,
    RESTORE_SESSION_ERROR,
    STEP_BACK_END,
    STEP_BACK_END_REPROMPT
} = require("../common.js");

const {
    build_navigation_response,
    build_compare_response
} = require("../navigation/navigation_helper.js");

const {
    get_melvin_state,
    update_melvin_state,
    update_melvin_aux_state,
    get_melvin_history,
    get_prev_melvin_state,
    clean_melvin_state,
    clean_melvin_aux_state,
    validate_required_datatypes
} = require("../utils/navigation_utils.js");

const {
    get_state_change_diff, build_melvin_voice_response 
} = require("../utils/response_builder_utils.js");
const sessions_doc = require("../dao/sessions.js");
const utterances_doc = require("../dao/utterances.js");
const { add_to_APL_text_pager } = require("../utils/APL_utils.js");


const NavigateJoinFilterIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "NavigateJoinFilterIntent";
    },
    async handle(handlerInput) {
        let speech_text = "";
        let reprompt_text = "";
        try {
            const state_change = await update_melvin_state(handlerInput);
            validate_required_datatypes(state_change);
            let response = await build_navigation_response(handlerInput, state_change);
            speech_text = response["speech_text"];
            reprompt_text = response["reprompt_text"];
            console.info(`[NavigateJoinFilterIntentHandler] response: ${JSON.stringify(response)}`);
        } catch (error) {
            speech_text = build_melvin_voice_response(_.get(error, "speech", DEFAULT_GENERIC_ERROR_SPEECH_TEXT));
            reprompt_text = build_melvin_voice_response(DEFAULT_ERROR_REPROMPT);
            add_to_APL_text_pager(handlerInput, "");
            console.error(`[NavigateJoinFilterIntentHandler] error: ${error.message}`, error);
        }

        return handlerInput.responseBuilder
            .speak(speech_text)
            .reprompt(reprompt_text)
            .withShouldEndSession(false)
            .getResponse();
    }
};

const NavigateCompareIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "NavigateCompareIntent";
    },
    async handle(handlerInput) {
        let speech_text = "";
        let reprompt_text = "";
        try {
            const state_change = await update_melvin_aux_state(handlerInput);
            const melvin_state = get_melvin_state(handlerInput);
            const compare_state = {
                ...melvin_state, ...state_change["updated_state"]
            };
            const state_diff = get_state_change_diff(state_change);
            let response = await build_compare_response(handlerInput, melvin_state, compare_state, state_diff);
            speech_text = response["speech_text"];
            reprompt_text = response["reprompt_text"];
            console.info(`[NavigateCompareIntentHandler] response: ${JSON.stringify(response)}`);
        } catch (error) {
            speech_text = build_melvin_voice_response(_.get(error, "speech", DEFAULT_GENERIC_ERROR_SPEECH_TEXT));
            reprompt_text = build_melvin_voice_response(DEFAULT_ERROR_REPROMPT);
            add_to_APL_text_pager(handlerInput, "");
            console.error(`[NavigateCompareIntentHandler] error: ${error.message}`, error);
        } finally {
            clean_melvin_aux_state(handlerInput);
        }
        return handlerInput.responseBuilder
            .speak(speech_text)
            .reprompt(reprompt_text)
            .withShouldEndSession(false)
            .getResponse();
    }
};

const NavigateResetIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "NavigateResetIntent";
    },
    async handle(handlerInput) {
        const speech_text = build_melvin_voice_response(`Ok. ${MELVIN_WELCOME_GREETING}`);
        const reprompt_text = build_melvin_voice_response("What would you like to know?");
        clean_melvin_state(handlerInput);
        clean_melvin_aux_state(handlerInput);
        const apl_text = `Welcome to ${MELVIN_APP_NAME}. You can start with a gene, cancer type, or data type.`;
        add_to_APL_text_pager(handlerInput, apl_text);
        return handlerInput.responseBuilder
            .speak(speech_text)
            .reprompt(reprompt_text)
            .withShouldEndSession(false)
            .getResponse();
    }
};

const NavigateRestoreSessionIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "NavigateRestoreSessionIntent";
    },
    async handle(handlerInput) {
        let speech_text = "";
        let reprompt_text = "";
        const card_text_list = [];
        const user_id = handlerInput.requestEnvelope.session.user.userId;
        const curr_session_id = handlerInput.requestEnvelope.session.sessionId;

        try {
            let recent_session = await sessions_doc.getMostRecentSession(user_id);
            // filter current session
            recent_session = recent_session.filter(item => item["session_id"] != curr_session_id); 
            if (recent_session.length == 0) {
                speech_text = build_melvin_voice_response(RESTORE_SESSION_NO_PREV);
                reprompt_text = build_melvin_voice_response(RESTORE_SESSION_NO_PREV);
                return handlerInput.responseBuilder
                    .speak(speech_text)
                    .reprompt(reprompt_text)
                    .withShouldEndSession(false)
                    .getResponse();
            }
            const prev_session_id = recent_session[0]["session_id"];
            const utterance_list = await utterances_doc.getMostRecentUtterance(user_id, prev_session_id);
            console.debug(`[NavigateRestoreSessionIntentHandler] recent_utterance: ${JSON.stringify(utterance_list)}`);
    
            if (utterance_list.length == 0) {
                speech_text = build_melvin_voice_response(RESTORE_SESSION_NO_ANALYSIS);
                reprompt_text = build_melvin_voice_response(RESTORE_SESSION_NO_ANALYSIS);
                return handlerInput.responseBuilder
                    .speak(speech_text)
                    .reprompt(reprompt_text)
                    .withShouldEndSession(false)
                    .getResponse();
            }
    
            const melvin_state = utterance_list[0]["melvin_state"];
            const melvin_history = utterance_list[0]["melvin_history"];
            const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
            sessionAttributes["MELVIN.HISTORY"] = melvin_history;
            sessionAttributes["MELVIN.STATE"] = melvin_state;
            handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
    
            speech_text = build_melvin_voice_response(RESTORE_SESSION_SUCCESS);
            reprompt_text = build_melvin_voice_response(RESTORE_SESSION_SUCCESS_REPROMPT);
            for (let key in melvin_state) {
                card_text_list.push(`${key}: ${melvin_state[key]}`);
            }
        } catch (error) {
            speech_text = build_melvin_voice_response(_.get(error, "speech", RESTORE_SESSION_ERROR));
            reprompt_text = build_melvin_voice_response(DEFAULT_ERROR_REPROMPT);
            add_to_APL_text_pager(handlerInput, "");
            console.error(`[NavigateRestoreSessionIntentHandler] error: ${error.message}`, error);
        }
        
        return handlerInput.responseBuilder
            .speak(speech_text)
            .reprompt(reprompt_text)
            .withSimpleCard(MELVIN_APP_NAME, card_text_list.join("\n"))
            .withShouldEndSession(false)
            .getResponse();
    }
};

const NavigateRepeatIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "NavigateRepeatIntent";
    },
    async handle(handlerInput) {
        let speech_text = "";
        let reprompt_text = "";
        try {
            const melvin_state = get_melvin_state(handlerInput);
            const prev_melvin_state = get_prev_melvin_state(handlerInput);
            const state_change = {
                "prev_state":    prev_melvin_state,
                "updated_state": melvin_state
            };

            let response = await build_navigation_response(handlerInput, state_change);
            speech_text = response["speech_text"];
            reprompt_text = response["reprompt_text"];
            console.info(`[NavigateRepeatIntentHandler] response: ${JSON.stringify(response)}`);
        } catch (error) {
            speech_text = build_melvin_voice_response(_.get(error, "speech", DEFAULT_GENERIC_ERROR_SPEECH_TEXT));
            reprompt_text = build_melvin_voice_response(DEFAULT_ERROR_REPROMPT);
            add_to_APL_text_pager(handlerInput, "");
            console.error(`[NavigateRepeatIntentHandler] error: ${error.message}`, error);
        }
        return handlerInput.responseBuilder
            .speak(speech_text)
            .reprompt(reprompt_text)
            .withShouldEndSession(false)
            .getResponse();
    }
};

const NavigateGoBackIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "NavigateGoBackIntent";
    },
    async handle(handlerInput) {
        const melvin_history = get_melvin_history(handlerInput);
        console.debug("[NavigateGoBackIntentHandler] melvin_history: " + JSON.stringify(melvin_history));
        let go_back_counter = 1;
        let prev_item = 0;
        let stop_go_back_counter = false;

        for (let item in melvin_history) {
            let item_event_type = melvin_history[item]["event_type"];

            if (item_event_type === MelvinEventTypes.NAVIGATION_EVENT) {
                continue;
            }

            if (item_event_type === MelvinEventTypes.NAVIGATION_REVERT_EVENT && stop_go_back_counter == false) {
                go_back_counter += 1;
                console.debug(`[NavigateGoBackIntentHandler] increment go_back_counter: ${go_back_counter}`);

            } else {
                stop_go_back_counter = true;
                if (item_event_type === MelvinEventTypes.ANALYSIS_EVENT) {
                    if (go_back_counter <= 0) {
                        prev_item = melvin_history[item];
                        break;
                    }
                    go_back_counter -= 1;
                    console.debug(`[NavigateGoBackIntentHandler] decrement go_back_counter: ${go_back_counter}`);
                }
            }
        }
        console.debug("[NavigateGoBackIntentHandler] prev_item: " + JSON.stringify(prev_item));

        if (prev_item == 0) {
            const speech_text = build_melvin_voice_response(STEP_BACK_END);
            const reprompt_text = build_melvin_voice_response(STEP_BACK_END_REPROMPT);
            return handlerInput.responseBuilder
                .speak(speech_text)
                .reprompt(reprompt_text)
                .withShouldEndSession(false)
                .getResponse();
        }
        // save current melvin state
        const curr_melvin_state = get_melvin_state(handlerInput);

        // update current melvin state with previous state in the session
        const melvin_state = prev_item["melvin_state"];
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        sessionAttributes["MELVIN.STATE"] = melvin_state;
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

        const state_change = {
            "prev_state":    curr_melvin_state,
            "updated_state": melvin_state
        };

        let speech_text = "";
        let reprompt_text = "";
        try {
            let response = await build_navigation_response(handlerInput, state_change);
            speech_text = response["speech_text"];
            reprompt_text = response["reprompt_text"];
            console.info(`[NavigateGoBackIntentHandler] response: ${JSON.stringify(response)}`);
        } catch (error) {
            speech_text = build_melvin_voice_response(_.get(error, "speech", DEFAULT_GENERIC_ERROR_SPEECH_TEXT));
            reprompt_text = build_melvin_voice_response(DEFAULT_ERROR_REPROMPT);
            add_to_APL_text_pager(handlerInput, "");
            console.error(`[NavigateGoBackIntentHandler] error: ${error.message}`, error);
        }
        return handlerInput.responseBuilder
            .speak(speech_text)
            .reprompt(reprompt_text)
            .withShouldEndSession(false)
            .getResponse();

    }
};


module.exports = {
    NavigateResetIntentHandler,
    NavigateRestoreSessionIntentHandler,
    NavigateJoinFilterIntentHandler,
    NavigateCompareIntentHandler,
    NavigateGoBackIntentHandler,
    NavigateRepeatIntentHandler
};