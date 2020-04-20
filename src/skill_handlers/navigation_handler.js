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
    build_navigation_response,
    ack_attribute_change
} = require('../navigation/navigation_helper.js');


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
            const oov_data = state_change['oov_data'];
            const response = ack_attribute_change(handlerInput, oov_data);
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
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        const speechText = `Ok. ${MELVIN_WELCOME_GREETING}`;

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(reprompt_text)
            .withStandardCard(`Welcome to ${MELVIN_APP_NAME}`, 'You can start with a gene or cancer type.')
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
            let response = await build_navigation_response(handlerInput, melvin_state);
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

        for (let item in melvin_history) {
            let item_event_type = melvin_history[item]['event_type'];
            if (item_event_type === MelvinEventTypes.ANALYSIS_EVENT) {
                if (go_back_counter <= 0) {
                    prev_item = melvin_history[item];
                    break;
                }
                go_back_counter -= 1;
                console.debug(`[NavigateGoBackIntentHandler] decrement go_back_counter: ${go_back_counter}`)

            } else if (item_event_type === MelvinEventTypes.NAVIGATION_REVERT_EVENT) {
                go_back_counter += 1;
                console.debug(`[NavigateGoBackIntentHandler] increment go_back_counter: ${go_back_counter}`)

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

        let speechText = '';
        try {
            const melvin_state = prev_item['melvin_state'];
            let response = await build_navigation_response(handlerInput, melvin_state);
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