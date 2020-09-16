const _ = require("lodash");

const { MelvinEventTypes } = require("../common.js");

const handler_map = {};

const get_event_type = function (handlerInput) {
    if (_.has(handlerInput, "requestEnvelope.request.intent.name")) {
        const intent_name = handlerInput.requestEnvelope.request.intent.name;
        if (_.has(handler_map, intent_name)) {
            return handler_map[intent_name]["event"];
        }
        return MelvinEventTypes.UNMAPPED_EVENT;

    } else if (_.get(handlerInput, "requestEnvelope.request.type") === "LaunchRequest") {
        return MelvinEventTypes.LAUNCH_EVENT;

    } else if (_.get(handlerInput, "requestEnvelope.request.type") === "SessionEndedRequest") {
        return MelvinEventTypes.SESSION_ENDED_EVENT;

    } else {
        return MelvinEventTypes.UNKNOWN_EVENT;
    }
};

const add_event_configuration = function (name, event, intent) {
    handler_map[name] = {
        event: event, intent: intent 
    };
};

module.exports = {
    handler_map,
    get_event_type,
    add_event_configuration,
};