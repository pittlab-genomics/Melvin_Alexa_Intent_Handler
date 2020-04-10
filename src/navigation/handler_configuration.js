const _ = require('lodash');

const {
    MelvinEventTypes
} = require('../common.js');

const handler_map = {
};

const get_event_type = function (handlerInput) {
    const intent_name = handlerInput.requestEnvelope.request.intent.name;
    if (_.has(handler_map, intent_name)) {
        return handler_map[intent_name]['event'];
    }
    return MelvinEventTypes.UNKNOWN;
}

const add_event_configuration = function (name, event, intent) {
    handler_map[name] = { event: event, intent: intent };
}

module.exports = {
    handler_map,
    get_event_type,
    add_event_configuration,
}