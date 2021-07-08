const _ = require("lodash");
const { get_user_preference_name } = require("../common");
const { getUserInfo } = require("../utils/preference_utils");

const EnableUserPreferenceIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "EnableUserPreferenceIntent";
    },
    async handle(handlerInput) {
        const { accessToken } = handlerInput.requestEnvelope.context.System.user;
        let speechText = "";
        let repromptText = "";
    
        if (!accessToken) {
            speechText = "You must authenticate with your Amazon Account to use this feature." + 
                " Go to the home screen in your Alexa app and follow the instructions. What else?";
            repromptText = "What else?";
            return handlerInput.responseBuilder
                .speak(speechText)
                .reprompt(repromptText)
                .withLinkAccountCard()
                .getResponse();
        } else {
            const preferenceName = get_user_preference_name(_.get(handlerInput, 
                "requestEnvelope.request.intent.slots.preference.value"));
            const userInfo = await getUserInfo(accessToken);
            let {
                email, name, user_id 
            } = userInfo;

            const attributesManager = handlerInput.attributesManager;
            let attributes = {
                [preferenceName]: true, "email": email, "name": name, "user_id": user_id 
            };

            attributesManager.setPersistentAttributes(attributes);
            await attributesManager.savePersistentAttributes();
            console.log(`[EnableUserPreferenceIntentHandler] preferenceName: ${preferenceName}, ` +
                `userInfo: ${JSON.stringify(userInfo)}`);
            speechText = "Your preference was updated. What else?";
            repromptText = "What else?";
            return handlerInput.responseBuilder
                .speak(speechText)
                .reprompt(repromptText)
                .getResponse();
        }
    }
};

const DisableUserPreferenceIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "DisableUserPreferenceIntent";
    },
    async handle(handlerInput) {
        const { accessToken } = handlerInput.requestEnvelope.context.System.user;
        let speechText = "";
        let repromptText = "";
    
        if (!accessToken) {
            speechText = "You must authenticate with your Amazon Account to use this feature." + 
                " Go to the home screen in your Alexa app and follow the instructions. What else?";
            repromptText = "What else?";
            return handlerInput.responseBuilder
                .speak(speechText)
                .reprompt(repromptText)
                .withLinkAccountCard()
                .getResponse();
        } else {
            const preferenceName = get_user_preference_name(_.get(handlerInput, 
                "requestEnvelope.request.intent.slots.preference.value"));
            const userInfo = await getUserInfo(accessToken);
            let {
                email, name, user_id 
            } = userInfo;

            const attributesManager = handlerInput.attributesManager;
            let attributes = {
                [preferenceName]: false, "email": email, "name": name, "user_id": user_id 
            };

            attributesManager.setPersistentAttributes(attributes);
            await attributesManager.savePersistentAttributes();
            console.log(`[DisableUserPreferenceIntentHandler] preferenceName: ${preferenceName}, ` +
                `userInfo: ${JSON.stringify(userInfo)}`);
            speechText = "Your preference was updated. What else?";
            repromptText = "What else?";
            return handlerInput.responseBuilder
                .speak(speechText)
                .reprompt(repromptText)
                .getResponse();
        }
    }
};

module.exports = {
    EnableUserPreferenceIntentHandler,
    DisableUserPreferenceIntentHandler
};