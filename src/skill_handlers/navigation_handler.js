const Speech = require('ssml-builder');
const _ = require('lodash');

const {
    MelvinEventTypes,
    MELVIN_WELCOME_GREETING,
    MELVIN_APP_NAME,
    DEFAULT_GENERIC_ERROR_SPEECH_TEXT
} = require('../common.js');

const {
    update_melvin_state,
    validate_navigation_intent_state,
    get_melvin_history,
    get_melvin_state,
    get_prev_melvin_state,
    build_navigation_response,
    ack_attribute_change
} = require('../navigation/navigation_helper.js');

const sessions_doc = require('../dao/sessions.js');
const utterances_doc = require('../dao/utterances.js');

const NavigateStartIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'NavigateStartIntent';
    },
    async handle(handlerInput) {
        let speechText = '';
        try {
            const state_change = await update_melvin_state(handlerInput);
            validate_navigation_intent_state(handlerInput, state_change);
            const response = ack_attribute_change(handlerInput, state_change);
            speechText = response['speech_text'];

        } catch (error) {
            if (error['speech']) {
                speechText = error['speech'];
            } else {
                speechText = DEFAULT_GENERIC_ERROR_SPEECH_TEXT;
            }
            console.error(`Error in NavigateStartIntentHandler`, error);
        }

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};


const NavigateJoinFilterIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'NavigateJoinFilterIntent';
    },
    async handle(handlerInput) {
        let speechText = '';
        try {
            const state_change = await update_melvin_state(handlerInput);
            const melvin_state = validate_navigation_intent_state(handlerInput, state_change);
            let response = await build_navigation_response(handlerInput, melvin_state, state_change);
            speechText = response['speech_text'];

        } catch (error) {
            if (error['speech']) {
                speechText = error['speech'];
            } else {
                speechText = DEFAULT_GENERIC_ERROR_SPEECH_TEXT;
            }
            console.error(`[NavigateJoinFilterIntentHandler] Error! except: `, error);
        }

        console.log("[NavigateJoinFilterIntentHandler] SPEECH TEXT = " + speechText);
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
}

const NavigateResetIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'NavigateResetIntent';
    },
    async handle(handlerInput) {
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        const speechText = `Ok. ${MELVIN_WELCOME_GREETING}`;
        const reprompt_text = 'What would you like to know? You can ask me about a gene or a cancer type.'
        sessionAttributes['MELVIN.STATE'] = {};
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(reprompt_text)
            .withStandardCard(`Welcome to ${MELVIN_APP_NAME}`, 'You can start with a gene or cancer type.')
            .getResponse();
    }
};

const NavigateRestoreSessionIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'NavigateRestoreSessionIntent';
    },
    async handle(handlerInput) {
        let speechText = "";
        let repromptText = "";
        const user_id = handlerInput.requestEnvelope.session.user.userId;
        const curr_session_id = handlerInput.requestEnvelope.session.sessionId;

        let recent_session = await sessions_doc.getMostRecentSession(user_id);
        recent_session = recent_session.filter(item => item['session_id'] != curr_session_id); // filter current session
        if (recent_session.length == 0) {
            speechText = "I could not find any previous sessions.";
            repromptText = "There were no previous sessions. Please continue with current analysis.";
            return handlerInput.responseBuilder
                .speak(speechText)
                .reprompt(repromptText)
                .getResponse();
        }

        const utterance_list = await utterances_doc.getMostRecentUtterance(user_id, recent_session[0]['session_id']);
        console.debug(`[NavigateRestoreSessionIntentHandler] recent_utterance: ${JSON.stringify(utterance_list)}`);

        if (utterance_list.length == 0) {
            speechText = "Something went wrong while restoring the session. Please try again later.";
            repromptText = "Something went wrong while restoring the session. Please try again later.";
            return handlerInput.responseBuilder
                .speak(speechText)
                .reprompt(repromptText)
                .getResponse();
        }

        const melvin_state = utterance_list[0]['melvin_state'];
        const melvin_history = utterance_list[0]['melvin_history'];
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        sessionAttributes['MELVIN.HISTORY'] = melvin_history;
        sessionAttributes['MELVIN.STATE'] = melvin_state;
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

        speechText = `Ok. Your last session was restored.`;
        repromptText = "You may continue from your last analysis now."

        let card_text_list = [];
        for (let key in melvin_state) {
            card_text_list.push(`${key}: ${melvin_state[key]}`);
        }
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(repromptText)
            .withSimpleCard(MELVIN_APP_NAME, card_text_list.join(" | "))
            .getResponse();
    }
};

const NavigateRepeatIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'NavigateRepeatIntent';
    },
    async handle(handlerInput) {
        let speechText = '';
        try {
            const melvin_state = get_melvin_state(handlerInput);
            const prev_melvin_state = get_prev_melvin_state(handlerInput);
            const state_change = {
                "prev_melvin_state": prev_melvin_state,
                "new_melvin_state": melvin_state
            };
            validate_navigation_intent_state(handlerInput, state_change);
            let response = await build_navigation_response(handlerInput, melvin_state, state_change);
            speechText = response['speech_text'];

        } catch (error) {
            if (error['speech']) {
                speechText = error['speech'];
            } else {
                speechText = DEFAULT_GENERIC_ERROR_SPEECH_TEXT;
            }
            console.error(`[NavigateRepeatIntentHandler] Error! except: `, error);
        }

        console.log("SPEECH TEXT = " + speechText);
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};

const NavigateGoBackIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'NavigateGoBackIntent';
    },
    async handle(handlerInput) {
        const melvin_history = get_melvin_history(handlerInput);
        console.debug("[NavigateGoBackIntentHandler] melvin_history: " + JSON.stringify(melvin_history));
        let go_back_counter = 1;
        let prev_item = 0;
        let stop_go_back_counter = false;

        for (let item in melvin_history) {
            let item_event_type = melvin_history[item]['event_type'];

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
                    console.debug(`[NavigateGoBackIntentHandler] decrement go_back_counter: ${go_back_counter}`)
                }
            }
        }
        console.debug("[NavigateGoBackIntentHandler] prev_item: " + JSON.stringify(prev_item));

        if (prev_item == 0) {
            const speechText = `You have reached the end of analysis series. Please provide a new query.`;
            return handlerInput.responseBuilder
                .speak(speechText)
                .reprompt(speechText)
                .getResponse();
        }
        // save current melvin state
        const curr_melvin_state = get_melvin_state(handlerInput);

        // update current melvin state with previous state in the session
        const melvin_state = prev_item['melvin_state'];
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        sessionAttributes['MELVIN.STATE'] = melvin_state;
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

        const state_change = {
            "prev_melvin_state": curr_melvin_state,
            "new_melvin_state": melvin_state
        };

        let speechText = '';
        try {
            validate_navigation_intent_state(handlerInput, state_change);
            let response = await build_navigation_response(handlerInput, melvin_state, state_change);
            speechText = response['speech_text'];

        } catch (error) {
            if (error['speech']) {
                speechText = error['speech'];
            } else {
                speechText = DEFAULT_GENERIC_ERROR_SPEECH_TEXT;
            }
            console.error(`[NavigateGoBackIntentHandler} Error! except: `, error);
        }

        console.log("SPEECH TEXT = " + speechText);
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();

    }
};


module.exports = {
    NavigateStartIntentHandler,
    NavigateResetIntentHandler,
    NavigateRestoreSessionIntentHandler,
    NavigateJoinFilterIntentHandler,
    NavigateGoBackIntentHandler,
    NavigateRepeatIntentHandler
}